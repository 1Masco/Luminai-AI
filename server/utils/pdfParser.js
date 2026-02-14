import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pdf = require('pdf-parse');

// Handle ESM/CJS interop or if library exports default or PDFParse
if (typeof pdf !== 'function') {
    if (pdf.default && typeof pdf.default === 'function') {
        pdf = pdf.default;
    } else if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
        pdf = pdf.PDFParse;
    }
}

export const extractTextFromPDF = async (buffer) => {
    try {
        if (typeof pdf !== 'function') {
            const keys = Object.keys(pdf || {});
            throw new Error(`pdf-parse is an object, not a function. Keys: ${keys.join(', ')}`);
        }
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};
