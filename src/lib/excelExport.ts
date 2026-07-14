// ============================================================================
// Excel Export — Export HR Personnel Directory to .xlsx
// Uses xlsx (SheetJS) — already in package.json
// ============================================================================

import * as XLSX from 'xlsx';
import type { CVRecord } from './cv';

/**
 * Export an array of CVRecords to an Excel file and trigger download.
 */
export function exportCvsToExcel(cvs: CVRecord[], filename?: string): void {
  const rows = cvs.map((cv, idx) => ({
    '#': idx + 1,
    'Candidate Name': cv.candidateName,
    'Discipline': cv.discipline,
    'Years Exp': cv.yearsExp || '',
    'Current Position': cv.currentPosition || '',
    'Education': cv.education || '',
    'Certifications': cv.certifications || '',
    'Key Skills': cv.keySkills || '',
    'Work Fields': cv.workFields || '',
    'Specialized Field': cv.specializedField || '',
    'Email': cv.contactInfo || '',
    'Phone': cv.phone || '',
    'Languages': cv.languages || '',
    'Status': cv.status,
    'AI Summary': cv.aiSummary || '',
    'Created At': cv.createdAt ? new Date(cv.createdAt).toLocaleDateString() : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 25 },  // Name
    { wch: 18 },  // Discipline
    { wch: 10 },  // Years
    { wch: 22 },  // Position
    { wch: 30 },  // Education
    { wch: 35 },  // Certifications
    { wch: 35 },  // Skills
    { wch: 25 },  // Work Fields
    { wch: 20 },  // Specialized
    { wch: 25 },  // Email
    { wch: 15 },  // Phone
    { wch: 15 },  // Languages
    { wch: 14 },  // Status
    { wch: 50 },  // AI Summary
    { wch: 12 },  // Created
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personnel Directory');

  const fname = filename || `HR_Personnel_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
