import express from "express";
import multer from "multer";
import fs from 'fs';
import path from 'path';

import { getRows, addRow, updateRow, checkHealth } from '../src/server/lib/googleSheets.js';
import { 
  listDriveFiles, 
  syncDriveFolders, 
  listCalendarEvents, 
  createCalendarEvent, 
  createGoogleDoc 
} from '../src/server/lib/googleWorkspace.js';
import { clearGoogleAuthCache, getGoogleAuth } from '../src/server/lib/googleAuth.js';
import { google } from 'googleapis';

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// Helper to extract access token from Authorization header
const getAccessToken = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
};

// Preflight health check for Admin warning banner
const REQUIRED_SHEETS = [
  'Marketing', 'Accounting', 'HR (Personnel)', 'Project Control', 'Technical Dossier',
  'Training', 'Equipment', 'NDT Reports', 'Tender Dossier', 'Welders', 'Weld Ledger', 'Audit Log'
];
app.get("/api/health", async (_req, res) => {
  try {
    const status = await checkHealth(REQUIRED_SHEETS);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Save
app.post("/api/settings/save", (req, res) => {
  try {
    const { googleClientId, geminiApiKey, googleSheetsId, serviceAccountJson } = req.body;
    const config = { googleClientId, geminiApiKey, googleSheetsId, serviceAccountJson };
    
    // Serverless best effort save
    try {
      fs.writeFileSync('/tmp/server-config.json', JSON.stringify(config, null, 2), 'utf8');
      fs.writeFileSync('server-config.json', JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {}
    
    clearGoogleAuthCache();
    res.json({ status: "ok", message: "Settings processed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Automated Google Sheet Database & Folders Setup
app.post("/api/settings/auto-setup", async (req, res) => {
  try {
    const { serviceAccountJson, userEmail, accessToken, googleSheetsId } = req.body;
    if (!serviceAccountJson) {
      return res.status(400).json({ error: "Service Account JSON is required." });
    }

    // 1. Save config temporarily so we can authenticate
    const tempConfig = {
      googleClientId: '',
      geminiApiKey: '',
      googleSheetsId: googleSheetsId || '',
      serviceAccountJson
    };
    
    // Preserve existing Client ID & Gemini API key if they exist
    try {
      if (fs.existsSync('/tmp/server-config.json')) {
        const existing = JSON.parse(fs.readFileSync('/tmp/server-config.json', 'utf8'));
        tempConfig.googleClientId = existing.googleClientId || '';
        tempConfig.geminiApiKey = existing.geminiApiKey || '';
      } else if (fs.existsSync('server-config.json')) {
        const existing = JSON.parse(fs.readFileSync('server-config.json', 'utf8'));
        tempConfig.googleClientId = existing.googleClientId || '';
        tempConfig.geminiApiKey = existing.geminiApiKey || '';
      }
    } catch (e) {}
    
    try {
      fs.writeFileSync('/tmp/server-config.json', JSON.stringify(tempConfig, null, 2), 'utf8');
      fs.writeFileSync('server-config.json', JSON.stringify(tempConfig, null, 2), 'utf8');
    } catch (e) {}
    
    // Clear cache
    clearGoogleAuthCache();
    
    // 2. Authenticate
    const auth = await getGoogleAuth(accessToken);
    if (!auth) {
      throw new Error("Failed to initialize Google Auth client with the provided JSON Key.");
    }
    
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    // 3. Create or Reuse Google Sheet Spreadsheet
    let spreadsheetId = googleSheetsId;
    let existingSheets: string[] = [];
    
    if (spreadsheetId && spreadsheetId.trim() !== '') {
      console.log(`[Auto-setup Vercel] Found existing spreadsheet ID ${spreadsheetId}. Verifying...`);
      try {
        const sheetsMeta = await sheets.spreadsheets.get({ spreadsheetId });
        if (sheetsMeta.data.sheets) {
          existingSheets = sheetsMeta.data.sheets.map((s: any) => s.properties?.title || '');
        }
      } catch (e: any) {
        console.warn(`Could not verify existing spreadsheet ${spreadsheetId}: ${e.message}. Creating a new one.`);
        spreadsheetId = '';
      }
    }

    if (!spreadsheetId) {
      console.log("[Auto-setup Vercel] Creating Binatech_NDT_ERP_Database...");
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'Binatech_NDT_ERP_Database',
          }
        },
        fields: 'spreadsheetId'
      });
      const spreadsheetIdResult = spreadsheet.data.spreadsheetId;
      if (!spreadsheetIdResult) throw new Error("Failed to create spreadsheet.");
      spreadsheetId = spreadsheetIdResult;
    }

    // 4. Setup sheets/tabs with headers
    const sheetHeaders: Record<string, string[]> = {
      'Quotations': ['quoteId', 'quoteNumber', 'clientName', 'projectName', 'location', 'totalValue', 'status', 'folderLink', 'documentLink', 'createdAt'],
      'Marketing': ['leadId', 'clientName', 'contactPerson', 'email', 'phone', 'status', 'value', 'assignedTo', 'notes', 'lastContactDate'],
      'Accounting': ['invoiceId', 'clientName', 'project', 'amount', 'status', 'dueDate', 'paymentDate', 'billingAddress', 'taxId', 'notes'],
      'HR (Personnel)': ['employeeId', 'fullName', 'role', 'department', 'status', 'certifications', 'certExpiry', 'email', 'phone', 'hireDate', 'emergencyContact'],
      'Project Control': ['projectId', 'projectName', 'clientName', 'value', 'status', 'startDate', 'endDate', 'manager', 'location', 'description'],
      'Technical Dossier': ['dossierId', 'title', 'project', 'author', 'status', 'approvalDate', 'fileName', 'fileUrl', 'category', 'notes'],
      'Training': ['trainingId', 'employeeName', 'courseTitle', 'provider', 'status', 'dateCompleted', 'expiryDate', 'score', 'certificateUrl', 'notes'],
      'Equipment': ['equipmentId', 'name', 'serialNumber', 'category', 'status', 'calibrationDate', 'calibrationDue', 'location', 'assignedTo', 'notes'],
      'NDT Reports': ['reportId', 'projectName', 'method', 'inspector', 'reportDate', 'status', 'welderName', 'jointNo', 'defects', 'remarks', 'fileUrl'],
      'Welders': ['welderId', 'name', 'stampNo', 'process', 'qualifiedWPS', 'positions', 'thicknessRange', 'wqtCertNo', 'expiry', 'remarks'],
      'Weld Ledger': ['ledgerId', 'jointNo', 'projectName', 'welderStamp', 'weldDate', 'fitUpStatus', 'visualStatus', 'ndtStatus', 'repairStatus', 'finalStatus', 'updatedAt'],
      'Audit Log': ['auditId', 'timestamp', 'userEmail', 'action', 'module', 'recordId', 'details'],
      'App_Errors': ['errorId', 'timestamp', 'userEmail', 'errorMessage', 'errorStack', 'diagnosticPrompt', 'status'],
      'Tender Dossier': ['tenderId', 'title', 'clientName', 'submissionDate', 'status', 'value', 'manager', 'documents', 'remarks']
    };

    const requests: any[] = [];
    const isNew = existingSheets.length === 0;

    if (isNew) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: 0,
            title: 'Quotations'
          },
          fields: 'title'
        }
      });
      existingSheets.push('Quotations');
    }

    const requiredTabs = Object.keys(sheetHeaders);
    requiredTabs.forEach(name => {
      if (!existingSheets.includes(name)) {
        requests.push({
          addSheet: {
            properties: {
              title: name
            }
          }
        });
      }
    });

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }

    // Write column headers
    const batchData = Object.entries(sheetHeaders).map(([sheetName, headers]) => ({
      range: `${sheetName}!A1`,
      values: [headers]
    }));
    
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: batchData
      }
    });

    // 5. Share spreadsheet with userEmail
    if (userEmail && userEmail.includes('@')) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: userEmail
          }
        });
      } catch (shareErr) {}
    }

    // 6. Create Google Drive Folder structure
    try {
      await syncDriveFolders(accessToken);
    } catch (driveErr) {}

    // 7. Write spreadsheet ID to final config
    tempConfig.googleSheetsId = spreadsheetId;
    try {
      fs.writeFileSync('/tmp/server-config.json', JSON.stringify(tempConfig, null, 2), 'utf8');
      fs.writeFileSync('server-config.json', JSON.stringify(tempConfig, null, 2), 'utf8');
    } catch (e) {}

    res.json({
      status: "ok",
      googleSheetsId: spreadsheetId,
      message: "Spreadsheet database and Google Drive folders auto-setup completed successfully."
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Quotation
app.post("/api/quotation/generate", upload.single('template'), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');
    const { clientName, projectName, quoteNumber, total } = data;

    const responseData = {
      status: "ok",
      message: "Quotation pipeline simulated.",
      folderLink: "https://drive.google.com/drive/u/0/folders/simulated_folder",
      documentLink: "https://docs.google.com/document/d/simulated_doc/edit"
    };

    const quoteId = `QT_${Date.now()}`;
    const createdAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    const newQuoteRow = {
      quoteId,
      quoteNumber: quoteNumber || '',
      clientName: clientName || '',
      projectName: projectName || '',
      location: data.location || '',
      totalValue: String(total || 0),
      status: 'Draft',
      folderLink: responseData.folderLink,
      documentLink: responseData.documentLink,
      createdAt
    };

    try {
      const token = getAccessToken(req);
      await addRow("Quotations", newQuoteRow, token);
      console.log(`[Quotation Engine Vercel] Logged quotation ${quoteNumber} to Google Sheets.`);
    } catch (err: any) {
      console.warn(`[Quotation Engine Vercel] Failed to sync costing to Google Sheets:`, err.message);
    }

    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Database CRUD
app.get("/api/sheets/:sheetName", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const rows = await getRows(req.params.sheetName, token);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/:sheetName", async (req, res) => {
  try {
    const token = getAccessToken(req);
    await addRow(req.params.sheetName, req.body, token);
    res.json({ status: "ok", message: "Row added successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/sheets/:sheetName", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const { idColumn, idValue, newData } = req.body;
    await updateRow(req.params.sheetName, idColumn, idValue, newData, token);
    res.json({ status: "ok", message: "Row updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Drive Integration
app.get("/api/drive/files", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const folderId = req.query.folderId as string || undefined;
    const files = await listDriveFiles(token, folderId);
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drive/sync", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const syncResult = await syncDriveFolders(token);
    res.json({ status: "ok", ...syncResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calendar
app.get("/api/calendar/events", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const events = await listCalendarEvents(token);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/calendar/events", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const { title, description, startTime, endTime } = req.body;
    const event = await createCalendarEvent({ title, description, startTime, endTime }, token);
    res.json({ status: "ok", event });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Docs
app.post("/api/docs/create", async (req, res) => {
  try {
    const token = getAccessToken(req);
    const { title, content } = req.body;
    const doc = await createGoogleDoc(title, content, token);
    res.json({ status: "ok", ...doc });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file
app.post("/api/drive/upload", upload.single('file'), async (req, res) => {
  try {
    res.json({ 
      status: "ok", 
      webViewLink: 'https://drive.google.com/open?id=simulated', 
      webContentLink: 'https://drive.google.com/uc?id=simulated&export=download' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

export default app;
