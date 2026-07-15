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
    } catch (e) {}
    
    res.json({ status: "ok", message: "Settings processed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quotation
app.post("/api/quotation/generate", upload.single('template'), async (req, res) => {
  try {
    const responseData = {
      status: "ok",
      message: "Quotation pipeline simulated.",
      folderLink: "https://drive.google.com/drive/u/0/folders/simulated_folder",
      documentLink: "https://docs.google.com/document/d/simulated_doc/edit"
    };
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
