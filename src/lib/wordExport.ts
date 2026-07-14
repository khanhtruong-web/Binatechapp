// ============================================================================
// Word Export — Generate .docx CV document from CVRecord
// Uses docxtemplater + pizzip (already in package.json)
// ============================================================================

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type { CVRecord } from './cv';

/** Minimal .docx skeleton (base64 encoded empty docx) */
const EMPTY_DOCX_B64 = 'UEsDBBQAAAAIAGFiV0cAAAAAAAAAAAAAAAALAAAAX3JlbHMvLnJlbHONzrEKwjAQBuC9+AjhbmmpgyimOojgKvUBQnJNo82l5K7VtzcuCg4O/8c//Hxl9Qqj'+
'eHCi4MnAuihBsLN+8NQZuDXX1QEEJUuDHT2zgDcnLKuQx5RXSZ5sMjClNEtrLTOPNxm8YUKlj1fxT3+7bN0ZOOyE6HPpfquhKqA8kOFrPgN'+
'UEsDBBQAAAAIAGFiV0cAAAAAAAAAAAAAAAARAAAAZG9jUHJvcHMvY29yZS54bWxNzrEKwjAQBuC9+Ahht7SVIoipdnAQnKU+QEiubTS5lNy1'+
'+vbGRcHh+/i5v6ze4igePFPwZGBdlCCYnO8DdQau7WV1AMFq6XT0xAY+TFhXe52n5MM9sCRSJMqJDQwppZ3WLAd4OxV4Y9j+cOlzu9JHe'+
'6FKTR7X2r8AUEsDBBQAAAAIAGFiV0cAAAAAAAAAAAAAAAARAAAAd29yZC9kb2N1bWVudC54bWxNjsEKwjAQRO+C/xD2btN6EJG2eBAEr1I/'+
'YEnWNtpkS7I1+vcGRfAyw8CbYcr6FWNN9rICExrYFBkIdH7iQF0D9/5x2oFgnfZVROt8AvObZKiVFZlUvjFyyQv17PzK5NHpSfzrRHyJkB'+
'VPTjBvh8cf3pYNVFqvUE4JJiWm+g5QSwMEFAAAAAgAYWJXRwAAAAAAAAAAAAAAABIAAAB3b3JkL2ZvbnRUYWJsZS54bWxNzrEKwjAQBuC9'+
'+Ahht7TiIiJt6SAITlIfICRnGpvcSu5a+/bGRcHhO/j4/6Z8xdHOOFGiwIYOeQmCnKdAkRq6+Md5D4JN6+2I3lMi8pN5rJWxBdQwMynL+E'+
'6T8icrIRfeIWWCY6hePqE9fy79fwBQSwMEFAAAAAgAYWJXRwAAAAAAAAAAAAAAAA8AAAB3b3JkL3N0eWxlcy54bWxNjsEKwjAQRO+C/xD2'+
'btJ6EBFbPQiCV9EPCMnahja7kqxW/97gIXiZYeDN0NRLmtyCC2Uysc7gIStBYAyUYuxq+IjP6wEEu85fCH1KKXMX5KjRzlVQ/5fJ+1CYZx'+
'cmpBdLGSLWJa9fVK/HTT92UEsDBBQAAAAIAGFiV0cAAAAAAAAAAAAAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbE2OywrCMBBF9/6EMNu0'+
'sRBE2urCB7iV+gFDMm1jk4lkpuLfGxfC8nIu5872OsVpivITMwVPBtZFCQLJ+S5Q38Db3C93INg66nz0xAa+TKjbncopcME3oZRD4pxE6V'+
'HBkHI6aMVuwMnxwitaXxufJ5cvOmtb6Ey1V3qt6wKkPzXI7G9QSwECFAAUAAAACABhYldHAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAApIEA'+
'AAAAX3JlbHMvLnJlbHNQSwECFAAUAAAACABhYldHAAAAAAAAAAAAAAAAEQAAAAAAAAAAAAAApIEpAAAAZG9jUHJvcHMvY29yZS54bWxQSwEC'+
'FAAUAAAACABhYldHAAAAAAAAAAAAAAAAEQAAAAAAAAAAAAAApIFYAAAAd29yZC9kb2N1bWVudC54bWxQSwECFAAUAAAACABhYldHAAAAAAAA'+
'AAAAAAAAEgAAAAAAAAAAAAAApIGHAAAAd29yZC9mb250VGFibGUueG1sUEsBAhQAFAAAAAgAYWJXRwAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAKSBAQAAAH'+
'dvcmQvc3R5bGVzLnhtbFBLAQIUABQAAAAIAGFiV0cAAAAAAAAAAAAAAAATAAAAAAAAAAAAAACkgS4BAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAAGAAYAWQEAAGkBAAAAAA==';

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Generate a .docx CV document and trigger download.
 * Uses a simple text-based approach (no template file needed).
 */
export function exportCvToWord(cv: CVRecord): void {
  // Build document content as structured text
  const sections = [
    '=== BINATECH NDT — CV PROFILE ===',
    '',
    `Candidate: ${cv.candidateName}`,
    `Position: ${cv.currentPosition || 'N/A'}`,
    `Discipline: ${cv.discipline}`,
    `Experience: ${cv.yearsExp || 'N/A'} years`,
    '',
    '--- EDUCATION ---',
    cv.education || 'N/A',
    '',
    '--- CERTIFICATIONS ---',
    cv.certifications || 'N/A',
    '',
    '--- KEY SKILLS ---',
    cv.keySkills || 'N/A',
    '',
    '--- WORK FIELDS ---',
    cv.workFields || 'N/A',
    '',
    '--- SPECIALIZED FIELD ---',
    cv.specializedField || 'N/A',
    '',
    '--- CONTACT ---',
    `Email: ${cv.contactInfo || 'N/A'}`,
    `Phone: ${cv.phone || 'N/A'}`,
    `Languages: ${cv.languages || 'N/A'}`,
    '',
    '--- AI STRATEGIC PROFILE ---',
    cv.aiSummary || 'N/A',
    '',
    cv.aiReviewReport ? '--- AI REVIEW REPORT ---' : '',
    cv.aiReviewReport || '',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    'Binatech NDT — Enterprise Resource Planning System',
  ].join('\n');

  // Create a simple docx with the content
  try {
    const zip = new PizZip(base64ToArrayBuffer(EMPTY_DOCX_B64));
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Since we're using a minimal template, just set the content directly
    doc.render();

    // Get the zip and modify the document.xml to include our content
    const outZip = doc.getZip();
    const contentXml = buildDocumentXml(cv);
    outZip.file('word/document.xml', contentXml);

    const blob = outZip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    downloadBlob(blob, `CV_${cv.candidateName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`);
  } catch {
    // Fallback: export as .txt if docx generation fails
    const blob = new Blob([sections], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `CV_${cv.candidateName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildDocumentXml(cv: CVRecord): string {
  const heading = (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  const subheading = (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="2563EB"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  const para = (text: string) =>
    `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  const labelValue = (label: string, value: string) =>
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(label)}: </w:t></w:r><w:r><w:t>${escapeXml(value || 'N/A')}</w:t></w:r></w:p>`;

  const spacer = () => `<w:p/>`;

  const body = [
    heading('BINATECH NDT — CV PROFILE'),
    spacer(),
    subheading('Candidate Information'),
    labelValue('Full Name', cv.candidateName),
    labelValue('Position', cv.currentPosition),
    labelValue('Discipline', cv.discipline),
    labelValue('Experience', `${cv.yearsExp || 'N/A'} years`),
    spacer(),
    subheading('Education'),
    para(cv.education || 'N/A'),
    spacer(),
    subheading('Certifications'),
    para(cv.certifications || 'N/A'),
    spacer(),
    subheading('Key Skills'),
    para(cv.keySkills || 'N/A'),
    spacer(),
    subheading('Work Fields & Specialization'),
    labelValue('Industries', cv.workFields),
    labelValue('Specialized Field', cv.specializedField),
    spacer(),
    subheading('Contact Information'),
    labelValue('Email', cv.contactInfo),
    labelValue('Phone', cv.phone),
    labelValue('Languages', cv.languages),
    spacer(),
    subheading('AI Strategic Profile'),
    para(cv.aiSummary || 'N/A'),
  ];

  if (cv.aiReviewReport) {
    body.push(spacer(), subheading('AI Review Report'), para(cv.aiReviewReport));
  }

  body.push(
    spacer(),
    para(`Generated: ${new Date().toISOString().slice(0, 10)} — Binatech NDT ERP v2.0`)
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:mv="urn:schemas-microsoft-com:mac:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:sl="http://schemas.openxmlformats.org/schemaLibrary/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:lc="http://schemas.openxmlformats.org/drawingml/2006/lockedCanvas"
  xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram">
  <w:body>${body.join('')}</w:body>
</w:document>`;
}
