import express from 'express';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const router = express.Router();

// Initialize Gemini AI with API key from environment
const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new GoogleGenAI({ apiKey });
};

// POST /api/gemini/live-session
// Create a live transcription session
router.post('/live-session', async (req, res) => {
    try {
        const ai = getAI();

        // This endpoint would handle WebSocket or Server-Sent Events
        // For now, return session config
        res.json({
            message: 'Live session endpoint - implement WebSocket for real-time streaming',
            model: 'gemini-2.5-flash-native-audio-preview-12-2025'
        });
    } catch (error) {
        console.error('Live session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/gemini/transcribe-audio
// Transcribe an audio file
router.post('/transcribe-audio', async (req, res) => {
    try {
        const { audioData, mimeType, fileName } = req.body;

        if (!audioData || !mimeType) {
            return res.status(400).json({ error: 'Missing audio data or mime type' });
        }

        const ai = getAI();

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: audioData,
                        },
                    },
                    {
                        text: `Please transcribe this audio file. This is: ${fileName || 'audio file'}. 
            Return a JSON object with: 
            - title (string)
            - transcript (array of {speaker: string, text: string, timestamp: number})
            - summary (string)
            - actionItems (array of strings)
            - sentiment (enum: positive, neutral, negative)
            - durationSeconds (number)`,
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        transcript: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    speaker: { type: Type.STRING },
                                    text: { type: Type.STRING },
                                    timestamp: { type: Type.NUMBER }
                                }
                            }
                        },
                        summary: { type: Type.STRING },
                        actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                        sentiment: { type: Type.STRING },
                        durationSeconds: { type: Type.NUMBER }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        res.json(result);

    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/gemini/generate-summary
// Generate meeting summary from transcript
router.post('/generate-summary', async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Missing transcript' });
        }

        const ai = getAI();

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Please summarize this meeting transcript and identify the main sentiment. Provide a concise summary and a few bullet points for action items.
      
      Transcript:
      ${transcript}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                        sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] }
                    },
                    required: ["summary", "actionItems", "sentiment"]
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        res.json(result);

    } catch (error) {
        console.error('Summary generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/gemini/chat
// Chat with AI about meeting content
router.post('/chat', async (req, res) => {
    try {
        const { transcript, question } = req.body;

        if (!transcript || !question) {
            return res.status(400).json({ error: 'Missing transcript or question' });
        }

        const ai = getAI();

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Context: You are an assistant analyzing a meeting recording.
      Transcript: ${transcript}
      
      User Question: ${question}`,
            config: {
                systemInstruction: "Be professional, helpful and refer specifically to the details in the transcript provided. If information is missing, say so."
            }
        });

        res.json({ answer: response.text || "I'm sorry, I couldn't process that." });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
