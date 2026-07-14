import { google } from 'googleapis';
import { getGoogleAuth } from './googleAuth.js';
import fs from 'fs';
import { getLocalRows, addLocalRow as addLocalDbRow, updateLocalRow as updateLocalDbRow } from './localDb.js';

// Helper to check if Google Config is set up
function hasGoogleConfig(): boolean {
  let hasSA = false;
  let hasSheet = false;
  try {
    if (fs.existsSync('server-config.json')) {
      const config = JSON.parse(fs.readFileSync('server-config.json', 'utf8'));
      if (config.serviceAccountJson) hasSA = true;
      if (config.googleSheetsId) hasSheet = true;
    }
  } catch (e) {}

  if (!hasSA && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    hasSA = true;
  }
  if (!hasSheet && process.env.GOOGLE_SHEETS_DATABASE_ID) {
    hasSheet = true;
  }
  return hasSA && hasSheet;
}

// Helper to resolve the spreadsheet ID from config file or environment
async function getSpreadsheetId(): Promise<string> {
  try {
    if (fs.existsSync('server-config.json')) {
      const config = JSON.parse(fs.readFileSync('server-config.json', 'utf8'));
      if (config.googleSheetsId) return config.googleSheetsId;
    }
  } catch (e) {}

  const envId = process.env.GOOGLE_SHEETS_DATABASE_ID;
  if (!envId) {
    throw new Error('Google Sheets Database ID is not configured. Please configure it in your Settings page.');
  }
  return envId;
}

// Minimal cache to avoid quota limits
let sheetCache = new Map<string, { timestamp: number, data: any[] }>();
const CACHE_TTL_MS = 60000; // 1 minute cache

export async function getSheetsClient(accessToken?: string) {
  const auth = await getGoogleAuth(accessToken);
  return google.sheets({ version: 'v4', auth });
}

export async function getRows(sheetName: string, accessToken?: string) {
  // If no Google configurations exist and no user access token is provided, fall back to local JSON database seamlessly
  if (!accessToken && !hasGoogleConfig()) {
    console.log(`[Google Sheets fallback] No configuration found. Loading ${sheetName} from local file db.`);
    return getLocalRows(sheetName);
  }

  // 1. Check Cache
  const cached = sheetCache.get(sheetName);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const spreadsheetId = await getSpreadsheetId();

    // 2. Fetch from Google Sheets API
    const sheets = await getSheetsClient(accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, 
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // 3. Parse headers and structure to JSON
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      let obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    // 4. Set Cache
    sheetCache.set(sheetName, { timestamp: Date.now(), data });
    
    return data;
  } catch (err: any) {
    console.warn(`[Google Sheets fallback] Error calling Sheets API for ${sheetName}: ${err.message}. Defaulting to local file db.`);
    return getLocalRows(sheetName);
  }
}

export async function addRow(sheetName: string, data: any, accessToken?: string) {
  if (!accessToken && !hasGoogleConfig()) {
    console.log(`[Google Sheets fallback] No configuration found. Saving ${sheetName} row to local file db.`);
    return addLocalDbRow(sheetName, data);
  }

  try {
    const sheets = await getSheetsClient(accessToken);
    const spreadsheetId = await getSpreadsheetId();

    // Fetch the sheet first to match header alignment
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, 
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) {
      throw new Error(`Sheet ${sheetName} has no headers. Please create headers first.`);
    }

    const headers = rows[0];
    const rawDataRow = headers.map(header => data[header] !== undefined ? String(data[header]) : '');

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rawDataRow]
      }
    });

    // Invalidate cache
    sheetCache.delete(sheetName);
  } catch (err: any) {
    console.warn(`[Google Sheets fallback] API append failed for ${sheetName}: ${err.message}. Writing to local file db.`);
    return addLocalDbRow(sheetName, data);
  }
}

export async function updateRow(sheetName: string, idColumn: string, idValue: string, newData: any, accessToken?: string) {
  if (!accessToken && !hasGoogleConfig()) {
    console.log(`[Google Sheets fallback] No configuration found. Updating ${sheetName} row in local file db.`);
    return updateLocalDbRow(sheetName, idColumn, idValue, newData);
  }

  try {
    const sheets = await getSheetsClient(accessToken);
    const spreadsheetId = await getSpreadsheetId();

    // 1. Fetch headers and current rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, 
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      throw new Error(`Sheet ${sheetName} is empty or has no columns`);
    }

    const headers = rows[0];
    const idColIdx = headers.indexOf(idColumn);
    if (idColIdx === -1) {
      throw new Error(`Column ${idColumn} not found in sheet ${sheetName}`);
    }

    // 2. Find row index (headers are row index 0, so spreadsheet row index is idx + 1 (1-based index))
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIdx] === idValue) {
        rowIndex = i + 1; // 1-based Row number in Google Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Row with ${idColumn} = ${idValue} not found in sheet ${sheetName}`);
    }

    // 3. Prepare the updated values based on headers
    const updatedRowValues = headers.map((header) => {
      if (newData[header] !== undefined) {
        return String(newData[header]);
      }
      const originalRow = rows[rowIndex - 1];
      const headerIdx = headers.indexOf(header);
      return originalRow[headerIdx] !== undefined ? String(originalRow[headerIdx]) : '';
    });

    // 4. Update the range
    const range = `${sheetName}!A${rowIndex}:${getColLetter(headers.length)}${rowIndex}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRowValues]
      }
    });

    // Invalidate cache
    sheetCache.delete(sheetName);
  } catch (err: any) {
    console.warn(`[Google Sheets fallback] API update failed for ${sheetName}: ${err.message}. Writing update to local file db.`);
    return updateLocalDbRow(sheetName, idColumn, idValue, newData);
  }
}

// Helper to convert column index to Excel-like letter (e.g. 1 -> A, 2 -> B, 26 -> Z, 27 -> AA, etc.)
function getColLetter(colIdx: number): string {
  let letter = '';
  while (colIdx > 0) {
    let temp = (colIdx - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    colIdx = Math.floor((colIdx - temp) / 26);
  }
  return letter || 'A';
}
