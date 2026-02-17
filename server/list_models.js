import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

async function listModels() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('No OPENAI_API_KEY found in .env');
        process.exit(1);
    }

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || `Failed with status ${response.status}`);
        }

        const listResult = await response.json();
        console.log('List Result:', util.inspect(listResult, { depth: null, colors: true }));
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
