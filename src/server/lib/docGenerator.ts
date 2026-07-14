import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export function injectDataIntoDocxTemplate(templateBuffer: Buffer, data: Record<string, any>): Buffer {
  try {
    // Load the docx file as binary content
    const zip = new PizZip(templateBuffer);
    
    // Parse the document
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // Render the document with the provided data
    doc.render(data);
    
    // Generate the output buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE', // Compress the output
    });
    
    return buf;
  } catch (error) {
    console.error('Error injecting data into docx template:', error);
    throw new Error('Failed to generate document from template.');
  }
}
