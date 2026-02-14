import express from 'express';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { validateRequest } from '../validation/middleware.js';
import {
  TranscribeAudioInputSchema,
  GenerateSummaryInputSchema,
  ChatInputSchema,
  ProcessPDFInputSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';

const router = express.Router();

const mapGeminiError = (error, fallbackMessage, fallbackCode = 'GEMINI_ERROR') => {
  const message = error?.message || '';

  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('"code":429')) {
    return new AppError(
      'Gemini quota exceeded. Check your plan/billing and retry later.',
      429,
      'GEMINI_QUOTA_EXCEEDED'
    );
  }

  if (message.includes('"code":401') || message.toLowerCase().includes('api key not valid')) {
    return new AppError(
      'Gemini API key is invalid or unauthorized.',
      401,
      'GEMINI_AUTH_ERROR'
    );
  }

  return new AppError(fallbackMessage, 502, fallbackCode);
};

/**
 * Initialize Gemini AI with API key from environment
 * @throws {AppError} If GEMINI_API_KEY is not configured
 */
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      'Gemini API not configured',
      503,
      'GEMINI_NOT_CONFIGURED'
    );
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * POST /api/gemini/live-session
 * Create a live transcription session
 */
router.post(
  '/live-session',
  asyncHandler(async (req, res) => {
    logger.info('Live session request', { requestId: req.id });

    try {
      const ai = getAI();

      // This endpoint would handle WebSocket or Server-Sent Events
      res.json({
        message: 'Live session endpoint - implement WebSocket for real-time streaming',
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Live session error', { error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('Gemini');
    }
  })
);

/**
 * POST /api/gemini/transcribe-audio
 * Transcribe an audio file using Gemini AI
 * Body: { audioData, mimeType, fileName? }
 */
router.post(
  '/transcribe-audio',
  validateRequest(TranscribeAudioInputSchema),
  asyncHandler(async (req, res) => {
    const { audioData, mimeType, fileName } = req.body;

    logger.info('Transcription request', { fileName, requestId: req.id });

    try {
      const ai = getAI();

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
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
          responseMimeType: 'application/json',
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
                    timestamp: { type: Type.NUMBER },
                  },
                },
              },
              summary: { type: Type.STRING },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              sentiment: { type: Type.STRING },
              durationSeconds: { type: Type.NUMBER },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');

      logger.info('Transcription successful', { fileName, requestId: req.id });

      res.json(result);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof SyntaxError) {
        logger.warn('Invalid Gemini response', { error: error.message, requestId: req.id });
        throw new AppError('Invalid transcription response', 502, 'GEMINI_INVALID_RESPONSE');
      }
      logger.error('Transcription error', { error: error.message, requestId: req.id });
      throw mapGeminiError(error, 'Gemini transcription failed', 'GEMINI_TRANSCRIPTION_ERROR');
    }
  })
);

/**
 * POST /api/gemini/generate-summary
 * Generate meeting summary from transcript
 * Body: { transcript }
 */
router.post(
  '/generate-summary',
  validateRequest(GenerateSummaryInputSchema),
  asyncHandler(async (req, res) => {
    const { transcript } = req.body;

    logger.info('Summary generation request', { requestId: req.id });

    try {
      const ai = getAI();

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Please summarize this meeting transcript and identify the main sentiment. Provide a concise summary and a few bullet points for action items.

Transcript:
${transcript}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
            },
            required: ['summary', 'actionItems', 'sentiment'],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');

      logger.info('Summary generated', { requestId: req.id });

      res.json(result);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof SyntaxError) {
        logger.warn('Invalid Gemini response', { error: error.message, requestId: req.id });
        throw new AppError('Invalid summary response', 502, 'GEMINI_INVALID_RESPONSE');
      }
      logger.error('Summary generation error', { error: error.message, requestId: req.id });
      throw mapGeminiError(error, 'Gemini summary generation failed', 'GEMINI_SUMMARY_ERROR');
    }
  })
);

/**
 * POST /api/gemini/process-pdf
 * Parse PDF and generate summary
 * Body: { fileData, fileName }
 */
router.post(
  '/process-pdf',
  validateRequest(ProcessPDFInputSchema),
  asyncHandler(async (req, res) => {
    const { fileData, fileName } = req.body;

    logger.info('PDF processing request', { fileName, requestId: req.id });

    try {
      let pdfBuffer;
      try {
        pdfBuffer = Buffer.from(fileData, 'base64');
      } catch (err) {
        throw new AppError('Invalid PDF payload', 400, 'INVALID_PDF_PAYLOAD');
      }

      const extractedTextRaw = await extractTextFromPDF(pdfBuffer);
      const extractedText = (extractedTextRaw || '').replace(/\u0000/g, '').trim();

      if (!extractedText) {
        throw new AppError('No readable text found in PDF', 422, 'PDF_NO_TEXT');
      }

      const transcriptChunks = extractedText
        .split(/\r?\n\s*\r?\n+/)
        .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
        .filter((chunk) => chunk && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(chunk));

      const transcript = (transcriptChunks.length > 0 ? transcriptChunks : [extractedText])
        .slice(0, 300)
        .map((text, index) => ({
          speaker: 'Document',
          text,
          timestamp: index * 30,
        }));

      const words = extractedText.split(/\s+/).filter(Boolean).length;
      const durationSeconds = Math.max(60, Math.ceil((words / 180) * 60));
      const title = fileName.replace(/\.[^/.]+$/, '');

      // Always return useful output even when Gemini isn't configured.
      let summary = transcript.slice(0, 3).map((t) => t.text).join(' ').slice(0, 1200);
      let actionItems = [];
      let sentiment = 'neutral';

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = getAI();
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Analyze this PDF text and return a concise JSON summary.

Text:
${extractedText.slice(0, 120000)}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
                },
              },
            },
          });

          const aiResult = JSON.parse(response.text || '{}');
          if (aiResult.summary) summary = aiResult.summary;
          if (Array.isArray(aiResult.actionItems)) actionItems = aiResult.actionItems;
          if (['positive', 'neutral', 'negative'].includes(aiResult.sentiment)) {
            sentiment = aiResult.sentiment;
          }
        } catch (aiError) {
          logger.warn('Gemini summary failed for PDF, using fallback summary', {
            requestId: req.id,
            fileName,
            error: aiError.message,
          });
        }
      }

      res.json({
        title,
        summary,
        actionItems,
        sentiment,
        durationSeconds,
        transcript,
      });

      logger.info('PDF processed', {
        fileName,
        requestId: req.id,
        transcriptChunks: transcript.length,
        usedGemini: Boolean(apiKey),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('PDF processing error', { fileName, error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('Gemini');
    }
  })
);

/**
 * POST /api/gemini/chat
 * Chat with AI about meeting content
 * Body: { transcript, question }
 */
router.post(
  '/chat',
  validateRequest(ChatInputSchema),
  asyncHandler(async (req, res) => {
    const { transcript, question } = req.body;

    logger.info('Chat request', { requestId: req.id });

    try {
      const ai = getAI();

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Context: You are an assistant analyzing a meeting recording.
Transcript: ${transcript}

User Question: ${question}`,
        config: {
          systemInstruction:
            'Be professional, helpful and refer specifically to the details in the transcript provided. If information is missing, say so.',
        },
      });

      const answer = response.text || "I'm sorry, I couldn't process that.";

      logger.info('Chat response sent', { requestId: req.id });

      res.json({ answer });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Chat error', { error: error.message, requestId: req.id });
      throw mapGeminiError(error, 'Gemini chat failed', 'GEMINI_CHAT_ERROR');
    }
  })
);

export default router;

