import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;

export const extractTextFromPDF = async (buffer) => {
    if (!PDFParse) {
        throw new Error('PDF parser is not available');
    }

    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        return result?.text || '';
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    } finally {
        await parser.destroy().catch(() => undefined);
    }
};
