import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found in .env');
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        const listResult = await ai.models.list();
        console.log('List Result:', util.inspect(listResult, { depth: null, colors: true }));
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
