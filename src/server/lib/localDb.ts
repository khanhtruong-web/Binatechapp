import fs from 'fs';
import path from 'path';

// Pick a writeable directory under Serverless environments (like Vercel)
let LOCAL_DB_PATH = path.join(process.cwd(), 'local_db.json');
try {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !fs.existsSync(process.cwd())) {
    LOCAL_DB_PATH = path.join('/tmp', 'local_db.json');
  }
} catch (e) {}

// Precompiled default mock database matching the system workflows
const DEFAULT_MOCK_DATA: Record<string, any[]> = {
  'Marketing': [
    { clientId: "C001", companyName: "Alpha Petroleum Ltd", contactPerson: "John Doe", status: "Hot", meetingLogs: "PAUT pipeline inspection requirements discussed." },
    { clientId: "C002", companyName: "Beta Refinery Services", contactPerson: "Jane Smith", status: "Warm", meetingLogs: "Sent proposal draft for general UT inspection." }
  ],
  'Accounting': [
    { invoiceId: "INV-2026-001", client: "C001", amount: "12500", status: "Paid", dueDate: "2026-06-30", opExpenses: "1200" },
    { invoiceId: "INV-2026-002", client: "C002", amount: "6200", status: "Pending", dueDate: "2026-07-15", opExpenses: "450" }
  ],
  'HR (Personnel)': [
    { empId: "E001", name: "Nguyen Van A", position: "Senior RT Inspector", certMethod: "RT", certLevel: "Level II", certExpiry: "2027-12-31", medicalExpiry: "2026-12-31", contractEnd: "2028-06-30" },
    { empId: "E002", name: "Tran Van B", position: "PAUT Specialist / Evaluator", certMethod: "PAUT", certLevel: "Level III", certExpiry: "2028-05-15", medicalExpiry: "2027-01-10", contractEnd: "2029-01-01" }
  ],
  'Project Control': [
    { projectId: "PRJ-001", client: "C001", scope: "Storage Tank UT Inspection & Assessment", startDate: "2026-06-01", endDate: "2026-08-30", progress: "45", personnel: "E001" },
    { projectId: "PRJ-002", client: "C002", scope: "Offshore Platform Weld PAUT scanning", startDate: "2026-07-01", endDate: "2026-07-15", progress: "10", personnel: "E002" }
  ],
  'Technical Dossier': [
    { docId: "DOC-VT-01", type: "Procedure", standard: "ASME", status: "Approved", driveLink: "https://drive.google.com/open?id=simulated_vt_procedure" },
    { docId: "DOC-PAUT-02", type: "Scanplan", standard: "API", status: "Draft", driveLink: "https://drive.google.com/open?id=simulated_paut_scanplan" }
  ],
  'Training': [
    { logId: "TR-001", empId: "E001", course: "Advanced Radiation Safety certification refresh", type: "Internal", hours: "40", date: "2026-03-10", certificate: "https://drive.google.com/open?id=simulated_cert" }
  ],
  'Equipment': [
    { tagNo: "EQ-PAUT-01", name: "Omniscan MX2", model: "OMNI-9942", type: "PAUT Machine", calDate: "2026-01-15", nextCal: "2027-01-15", status: "Active", maintenanceLog: "Annual calibration completed by Olympus services." },
    { tagNo: "EQ-YOKE-02", name: "Magnaflux Y-2 Web Yoke", model: "YK-8812", type: "Yoke", calDate: "2025-11-20", nextCal: "2026-11-20", status: "Active", maintenanceLog: "AC lift checked at 10 lbs with standard test weights." }
  ],
  'NDT Reports': [
    { reportNo: "REP-2026-001", projectId: "PRJ-001", jointNo: "J-101", method: "UT", result: "Accept", inspectorId: "E001", driveLink: "https://drive.google.com/open?id=simulated_report" }
  ],
  'Tender Dossier': [
    { tenderId: "TEN-2026-09", client: "C001", deadline: "2026-08-01", status: "Preparing", techMatrix: "https://drive.google.com/open?id=simulated_tech", commMatrix: "https://drive.google.com/open?id=simulated_comm" }
  ],
  'Welders': [
    { welderId: "W-015", name: "Le Van C", process: "GTAW+SMAW", qualExpiry: "2027-03-01", status: "Qualified", qualifiedWps: "WPS-P1-01, WPS-P1-02", positions: "6G", employer: "Binatech Sub A", certNo: "WQT-2026-015" }
  ],
  'Weld Ledger': [
    { ledgerId: "WL_SEED_001", jointId: "J-101", projectId: "PRJ-001", event: "NDT Done - Accept", date: "2026-07-01", drawingNo: "ISO-TK-001", refReportNo: "REP-2026-001", welderId: "W-015", method: "UT", remark: "Seed data" }
  ]
};

// Hybrid In-memory Database to avoid EROFS crashes
let memDb: Record<string, any[]> = JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));

// Safe startup initialization
try {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(DEFAULT_MOCK_DATA, null, 2), 'utf8');
  } else {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    memDb = JSON.parse(raw);
  }
} catch (error) {
  console.warn(`[localDb warning] Writable database file not initialized. Using in-memory fallback: ${error}`);
}

export function getLocalRows(sheetName: string): any[] {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      memDb = JSON.parse(raw);
    }
  } catch (error) {
    // Fail silently, use memDb
  }
  return memDb[sheetName] || [];
}

export function addLocalRow(sheetName: string, rowData: any) {
  if (!memDb[sheetName]) memDb[sheetName] = [];
  memDb[sheetName].push(rowData);
  
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memDb, null, 2), 'utf8');
  } catch (error) {
    console.warn(`[localDb warning] Failed to write addLocalRow to disk: ${error}`);
  }
}

export function deleteLocalRow(sheetName: string, idColumn: string, idValue: string) {
  if (!memDb[sheetName]) return;
  memDb[sheetName] = memDb[sheetName].filter((row: any) => String(row[idColumn]) !== String(idValue));
  
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memDb, null, 2), 'utf8');
  } catch (error) {
    console.warn(`[localDb warning] Failed to write deleteLocalRow to disk: ${error}`);
  }
}

export function updateLocalRow(sheetName: string, idColumn: string, idValue: string, newData: any) {
  if (!memDb[sheetName]) memDb[sheetName] = [];
  memDb[sheetName] = memDb[sheetName].map((row: any) => {
    if (String(row[idColumn]) === String(idValue)) {
      return { ...row, ...newData };
    }
    return row;
  });
  
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memDb, null, 2), 'utf8');
  } catch (error) {
    console.warn(`[localDb warning] Failed to write updateLocalRow to disk: ${error}`);
  }
}
