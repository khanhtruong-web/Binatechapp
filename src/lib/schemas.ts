import { FieldDef, ModuleSchema } from './types';

// Field schemas tuned for an NDT welding-inspection service company.
// The first 5 fields of each module are shown as grid columns in ModuleView.
export const MODULE_SCHEMAS: Record<string, ModuleSchema> = {
  'Marketing': {
    id: 'Marketing',
    name: 'Marketing',
    primaryKey: 'clientId',
    fields: [
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
      { name: 'companyName', label: 'Company Name', type: 'text', required: true },
      { name: 'industry', label: 'Industry', type: 'select', options: ['Oil & Gas', 'Petrochemical', 'Power Plant', 'Pipeline', 'Shipbuilding', 'Structural Steel', 'Storage Tank', 'Other'] },
      { name: 'status', label: 'Lead Status', type: 'select', options: ['Cold', 'Warm', 'Hot', 'Converted'] },
      { name: 'contactPerson', label: 'Contact Person', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'potentialValue', label: 'Potential Value ($)', type: 'number' },
      { name: 'nextFollowUp', label: 'Next Follow-up', type: 'date' },
      { name: 'meetingLogs', label: 'Meeting Logs', type: 'textarea' }
    ]
  },
  'Accounting': {
    id: 'Accounting',
    name: 'Accounting',
    primaryKey: 'invoiceId',
    fields: [
      { name: 'invoiceId', label: 'Invoice ID', type: 'text', required: true },
      { name: 'client', label: 'Client', type: 'lookup' },
      { name: 'projectId', label: 'Project ID', type: 'lookup' },
      { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
      { name: 'status', label: 'Payment Status', type: 'select', options: ['Pending', 'Partially Paid', 'Paid', 'Overdue'] },
      { name: 'vatPercent', label: 'VAT (%)', type: 'number' },
      { name: 'invoiceDate', label: 'Invoice Date', type: 'date' },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'paymentDate', label: 'Payment Date', type: 'date' },
      { name: 'opExpenses', label: 'Operational Expenses', type: 'number' },
      { name: 'remarks', label: 'Remarks', type: 'textarea' }
    ]
  },
  'HR (Personnel)': {
    id: 'HR (Personnel)',
    name: 'HR (Personnel)',
    primaryKey: 'empId',
    fields: [
      { name: 'empId', label: 'Employee ID', type: 'text', required: true },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'position', label: 'Position', type: 'text' },
      { name: 'certMethod', label: 'NDT Cert Method', type: 'select', options: ['RT', 'UT', 'PAUT', 'TOFD', 'MT', 'PT', 'ET', 'VT', 'UTM'] },
      { name: 'certLevel', label: 'Level', type: 'select', options: ['Level I', 'Level II', 'Level III'] },
      { name: 'certScheme', label: 'Cert Scheme', type: 'select', options: ['ASNT SNT-TC-1A', 'ISO 9712', 'CSWIP', 'AWS CWI', 'API'] },
      { name: 'certExpiry', label: 'Cert Expiry Date', type: 'date' },
      { name: 'medicalExpiry', label: 'Medical/Vision Expiry', type: 'date' },
      { name: 'radiationSafetyExpiry', label: 'Radiation Safety Expiry', type: 'date' },
      { name: 'contractEnd', label: 'Contract End Date', type: 'date' },
    ]
  },
  'Project Control': {
    id: 'Project Control',
    name: 'Project Control',
    primaryKey: 'projectId',
    fields: [
      { name: 'projectId', label: 'Project ID', type: 'text', required: true },
      { name: 'client', label: 'Client', type: 'lookup' },
      { name: 'status', label: 'Status', type: 'select', options: ['Planned', 'Ongoing', 'On Hold', 'Completed', 'Closed'] },
      { name: 'progress', label: 'Progress (%)', type: 'number' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'contractNo', label: 'Contract / PO No.', type: 'text' },
      { name: 'site', label: 'Site / Location', type: 'text' },
      { name: 'methods', label: 'NDT Methods', type: 'select', options: ['RT', 'UT', 'PAUT', 'TOFD', 'MT', 'PT', 'UTM', 'Multiple'] },
      { name: 'contractValue', label: 'Contract Value ($)', type: 'number' },
      { name: 'personnel', label: 'Assigned Personnel', type: 'lookup' },
      { name: 'scope', label: 'Scope of Work', type: 'textarea' }
    ]
  },
  'Technical Dossier': {
    id: 'Technical Dossier',
    name: 'Technical Dossier',
    primaryKey: 'docId',
    fields: [
      { name: 'docId', label: 'Document ID', type: 'text', required: true },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['WPS/PQR', 'NDT Procedure', 'Scanplan', 'Technique Sheet', 'Acceptance Criteria', 'Calibration Procedure', 'Radiation Safety Plan'] },
      { name: 'standard', label: 'Standard', type: 'select', options: ['ASME V', 'ASME VIII Div.1', 'ASME B31.3', 'API 1104', 'API 650', 'API 653', 'AWS D1.1', 'ISO 17636', 'ISO 17640', 'ISO 5817', 'ISO 9712'] },
      { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'For Review', 'Approved', 'Obsolete'] },
      { name: 'revision', label: 'Revision', type: 'text' },
      { name: 'approvedBy', label: 'Approved By (Level III)', type: 'text' },
      { name: 'issueDate', label: 'Issue Date', type: 'date' },
      { name: 'driveLink', label: 'Drive File', type: 'file' }
    ]
  },
  'Training': {
    id: 'Training',
    name: 'Training',
    primaryKey: 'logId',
    fields: [
      { name: 'logId', label: 'Log ID', type: 'text', required: true },
      { name: 'empId', label: 'Employee', type: 'lookup' },
      { name: 'course', label: 'Course Name', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['Internal', 'External', 'OJT'] },
      { name: 'result', label: 'Result', type: 'select', options: ['Pass', 'Fail', 'Attended'] },
      { name: 'provider', label: 'Training Provider', type: 'text' },
      { name: 'hours', label: 'Hours Tracked', type: 'number' },
      { name: 'date', label: 'Date Completed', type: 'date' },
      { name: 'certExpiry', label: 'Certificate Expiry', type: 'date' },
      { name: 'certificate', label: 'Certificate Drive Link', type: 'file' }
    ]
  },
  'Equipment': {
    id: 'Equipment',
    name: 'Equipment',
    primaryKey: 'tagNo',
    fields: [
      { name: 'tagNo', label: 'Tag No.', type: 'text', required: true },
      { name: 'name', label: 'Equipment Name', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['UT Flaw Detector', 'PAUT Unit', 'TOFD Unit', 'UT Probe/Transducer', 'MT Yoke', 'RT Crawler', 'Densitometer', 'Survey Meter', 'UV/White Light Meter', 'Calibration Block', 'UTM Gauge', 'Other'] },
      { name: 'nextCal', label: 'Next Cal. Due', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Expiring Soon', 'Out of Service', 'In Repair'] },
      { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { name: 'model', label: 'Model', type: 'text' },
      { name: 'serialNo', label: 'Serial No.', type: 'text' },
      { name: 'calDate', label: 'Calibration Date', type: 'date' },
      { name: 'calCertNo', label: 'Cal. Certificate No.', type: 'text' },
      { name: 'calAgency', label: 'Calibration Agency', type: 'text' },
      { name: 'location', label: 'Location / Custodian', type: 'text' },
      { name: 'maintenanceLog', label: 'Maintenance Log', type: 'textarea' }
    ]
  },
  'NDT Reports': {
    id: 'NDT Reports',
    name: 'NDT Reports',
    primaryKey: 'reportNo',
    fields: [
      { name: 'reportNo', label: 'Report No.', type: 'text', required: true },
      { name: 'projectId', label: 'Project ID', type: 'lookup', required: true },
      { name: 'jointNo', label: 'Joint / Weld No.', type: 'text' },
      { name: 'method', label: 'Method', type: 'select', options: ['RT', 'UT', 'PAUT', 'TOFD', 'MT', 'PT', 'VT', 'UTM'] },
      { name: 'result', label: 'Result', type: 'select', options: ['Accept', 'Reject'] },
      { name: 'drawingNo', label: 'Drawing / ISO No.', type: 'text' },
      { name: 'welderId', label: 'Welder ID', type: 'text' },
      { name: 'wpsNo', label: 'WPS No.', type: 'text' },
      { name: 'material', label: 'Material Spec', type: 'text' },
      { name: 'thickness', label: 'Thickness (mm)', type: 'number' },
      { name: 'diameter', label: 'Diameter (NPS/OD)', type: 'text' },
      { name: 'procedureNo', label: 'NDT Procedure No.', type: 'lookup' },
      { name: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'select', options: ['ASME VIII Div.1', 'ASME B31.3 Normal', 'ASME B31.3 Severe Cyclic', 'API 1104', 'API 650', 'AWS D1.1', 'ISO 5817-B', 'ISO 5817-C'] },
      { name: 'defectType', label: 'Defect Type', type: 'select', options: ['None', 'Porosity', 'Slag Inclusion', 'Lack of Fusion', 'Incomplete Penetration', 'Crack', 'Undercut', 'Tungsten Inclusion', 'Burn Through', 'Other'] },
      { name: 'defectLocation', label: 'Defect Location / Extent', type: 'text' },
      { name: 'repairStatus', label: 'Repair Status', type: 'select', options: ['N/A', 'R1', 'R2', 'Cut-out'] },
      { name: 'testDate', label: 'Test Date', type: 'date' },
      { name: 'inspectorId', label: 'Inspector', type: 'lookup' },
      { name: 'driveLink', label: 'Report PDF', type: 'file' }
    ]
  },
  'Tender Dossier': {
    id: 'Tender Dossier',
    name: 'Tender Dossier',
    primaryKey: 'tenderId',
    fields: [
      { name: 'tenderId', label: 'Tender ID', type: 'text', required: true },
      { name: 'client', label: 'Client', type: 'lookup' },
      { name: 'projectName', label: 'Project Name', type: 'text' },
      { name: 'deadline', label: 'Deadline', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Preparing', 'Submitted', 'Won', 'Lost', 'Cancelled'] },
      { name: 'submissionDate', label: 'Submission Date', type: 'date' },
      { name: 'bidValue', label: 'Bid Value ($)', type: 'number' },
      { name: 'methods', label: 'NDT Methods Required', type: 'text' },
      { name: 'techMatrix', label: 'Technical Matrix', type: 'file' },
      { name: 'commMatrix', label: 'Commercial Matrix', type: 'file' },
      { name: 'remarks', label: 'Remarks', type: 'textarea' }
    ]
  }
};
