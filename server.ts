import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import actual Google Sheets utilities
import { getRows, addRow, updateRow, deleteRow, checkHealth } from './src/server/lib/googleSheets.js';
import { 
  listDriveFiles, 
  syncDriveFolders, 
  listCalendarEvents, 
  createCalendarEvent, 
  createGoogleDoc 
} from './src/server/lib/googleWorkspace.js';
// import { createFolder, copyFile, uploadToDrive } from './src/server/lib/googleDrive.js';
// import { injectDataIntoDocxTemplate } from './src/server/lib/docGenerator.js';
import { clearGoogleAuthCache, getGoogleAuth } from './src/server/lib/googleAuth.js';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === API ROUTES ===

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

  // Settings Save to Server Configuration
  app.post("/api/settings/save", (req, res) => {
    try {
      const { googleClientId, geminiApiKey, googleSheetsId, serviceAccountJson } = req.body;
      const config = {
        googleClientId,
        geminiApiKey,
        googleSheetsId,
        serviceAccountJson
      };
      fs.writeFileSync('server-config.json', JSON.stringify(config, null, 2), 'utf8');
      // Clear the cached auth client to enforce reloading new keys
      clearGoogleAuthCache();
      res.json({ status: "ok", message: "Settings saved to server config successfully." });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Automated Google Sheet Database & Folders Setup
  app.post("/api/settings/auto-setup", async (req, res) => {
    try {
      const { serviceAccountJson, userEmail, accessToken } = req.body;
      if (!serviceAccountJson) {
        return res.status(400).json({ error: "Service Account JSON is required." });
      }

      // 1. Save config temporarily so we can authenticate
      const tempConfig = {
        googleClientId: '',
        geminiApiKey: '',
        googleSheetsId: '',
        serviceAccountJson
      };
      
      // Preserve existing Client ID & Gemini API key if they exist
      try {
        if (fs.existsSync('server-config.json')) {
          const existing = JSON.parse(fs.readFileSync('server-config.json', 'utf8'));
          tempConfig.googleClientId = existing.googleClientId || '';
          tempConfig.geminiApiKey = existing.geminiApiKey || '';
        }
      } catch (e) {}
      
      fs.writeFileSync('server-config.json', JSON.stringify(tempConfig, null, 2), 'utf8');
      
      // Clear the cached auth client to enforce loading new key
      clearGoogleAuthCache();
      
      // 2. Authenticate
      const auth = await getGoogleAuth(accessToken);
      if (!auth) {
        throw new Error("Failed to initialize Google Auth client with the provided JSON Key.");
      }
      
      const sheets = google.sheets({ version: 'v4', auth });
      const drive = google.drive({ version: 'v3', auth });
      
      // 3. Create Google Sheet Spreadsheet
      console.log("[Auto-setup] Creating spreadsheet Binatech_NDT_ERP_Database...");
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'Binatech_NDT_ERP_Database',
          }
        },
        fields: 'spreadsheetId'
      });
      const spreadsheetId = spreadsheet.data.spreadsheetId;
      if (!spreadsheetId) throw new Error("Failed to create spreadsheet.");

      // 4. Setup sheets/tabs with headers
      const sheetHeaders: Record<string, string[]> = {
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

      const requests: any[] = [{
        updateSheetProperties: {
          properties: {
            sheetId: 0,
            title: 'Marketing'
          },
          fields: 'title'
        }
      }];

      const otherSheets = Object.keys(sheetHeaders).filter(name => name !== 'Marketing');
      otherSheets.forEach(name => {
        requests.push({
          addSheet: {
            properties: {
              title: name
            }
          }
        });
      });

      console.log("[Auto-setup] Creating tabs inside spreadsheet...");
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });

      // Write column headers
      console.log("[Auto-setup] Writing column headers to tabs...");
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

      // 5. Share spreadsheet with userEmail (if provided)
      if (userEmail && userEmail.includes('@')) {
        console.log(`[Auto-setup] Sharing spreadsheet with user ${userEmail}...`);
        try {
          await drive.permissions.create({
            fileId: spreadsheetId,
            requestBody: {
              type: 'user',
              role: 'writer',
              emailAddress: userEmail
            }
          });
        } catch (shareErr) {
          console.warn("Could not share spreadsheet with user email (permissions error):", shareErr);
        }
      }

      // 6. Create Google Drive Folder structure
      console.log("[Auto-setup] Creating Google Drive folder structure...");
      try {
        await syncDriveFolders(accessToken);
      } catch (driveErr) {
        console.warn("Failed to create Drive folders, but spreadsheet was created successfully:", driveErr);
      }

      // 7. Write spreadsheet ID to final config
      tempConfig.googleSheetsId = spreadsheetId;
      fs.writeFileSync('server-config.json', JSON.stringify(tempConfig, null, 2), 'utf8');

      res.json({
        status: "ok",
        googleSheetsId: spreadsheetId,
        message: "Spreadsheet database and Google Drive folders auto-setup completed successfully."
      });
    } catch (error: any) {
      console.error("[Auto-setup Error]", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Quotation Generation
  app.post("/api/quotation/generate", upload.single('template'), async (req, res) => {
    try {
      const data = JSON.parse(req.body.data);
      const { clientName, projectName, quoteNumber, items, total } = data;
      
      const responseData: any = {
        status: "ok",
        message: "Quotation pipeline simulated.",
        folderLink: "https://drive.google.com/drive/u/0/folders/simulated_folder",
        documentLink: "https://docs.google.com/document/d/simulated_doc/edit"
      };

      // Below is the real logic that would execute if Google APIs were fully live and mocked keys were real:
      /*
      // Step A: Create specific Folder
      const folderName = `${quoteNumber} - ${clientName}`;
      const parentFolderId = process.env.QUOTATIONS_MASTER_FOLDER_ID; // Define this
      const newFolder = await createFolder(folderName, parentFolderId);
      
      let docLink = '';
      if (req.file) {
        // Step B1: Inject data into uploaded DOCX template
        // Using pizzip & docxtemplater
        const injectedDocxBuffer = injectDataIntoDocxTemplate(req.file.buffer, data);
        
        // Final Document Upload to new Folder
        const finalFileName = `Quotation_${quoteNumber}_${clientName}.docx`;
        const uploadedDoc = await uploadToDrive(injectedDocxBuffer, finalFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', newFolder.id);
        docLink = uploadedDoc.webViewLink;
      } else {
        // Step B2: Duplicate Google Sheet Costing Template
        const templateSheetId = process.env.MASTER_COSTING_TEMPLATE_ID;
        const newSheetName = `Costing_${quoteNumber}_${clientName}`;
        const newSheet = await copyFile(templateSheetId, newSheetName, newFolder.id);
        docLink = newSheet.webViewLink;
        // (You would normally then use sheets api to inject frontend data into this copied sheet)
      }
      
      // Step C: Update Master Database Log
      await addRow("Master_Quotation_Database", {
        quoteNo: quoteNumber,
        client: clientName,
        project: projectName,
        totalValue: total,
        date: new Date().toLocaleDateString(),
        status: "Draft",
        folderLink: newFolder.webViewLink
      });

      responseData.folderLink = newFolder.webViewLink;
      responseData.documentLink = docLink;
      */

      res.json(responseData);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });


  // Helper to extract access token from Authorization header
  const getAccessToken = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  };

  // Database Connector (CRUD for Sheets)
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

  app.delete("/api/sheets/:sheetName", async (req, res) => {
    try {
      const token = getAccessToken(req);
      const idColumn = (req.query.idColumn as string) || req.body?.idColumn;
      const idValue = (req.query.idValue as string) || req.body?.idValue;
      if (!idColumn || !idValue) {
        return res.status(400).json({ error: 'idColumn and idValue are required' });
      }
      await deleteRow(req.params.sheetName, idColumn, idValue, token);
      res.json({ status: "ok", message: "Row deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Real Google Drive integration endpoints
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

  // Real Google Calendar integration endpoints
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

  // Real Google Docs integration endpoints
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

  // File Vault (Drive Upload)
  app.post("/api/drive/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      const folderId = req.body.folderId || 'ROOT';
      
      // Upload using service account logic
      // const fileLinks = await uploadToDrive(req.file.buffer, req.file.originalname, req.file.mimetype, folderId);
      
      res.json({ 
        status: "ok", 
        webViewLink: 'https://drive.google.com/open?id=simulated', 
        webContentLink: 'https://drive.google.com/uc?id=simulated&export=download' 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fallback for unmatched API routes to ensure they return JSON instead of SPA HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // === VITE MIDDLEWARE (Development / UI Delivery) ===
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
