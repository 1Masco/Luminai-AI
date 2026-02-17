import express from 'express';
import { Blob } from 'buffer';
import { validateRequest } from '../validation/middleware.js';
import {
  TranscribeAudioInputSchema,
  GenerateSummaryInputSchema,
  ChatInputSchema,
  ProcessPDFInputSchema,
  RefineNoteInputSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';

const router = express.Router();
const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const DEFAULT_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const AI_PROVIDER_MODE = (process.env.AI_PROVIDER_MODE || 'balanced').toLowerCase();
const AI_PROVIDER_COOLDOWN_MS = Math.max(30000, Number(process.env.AI_PROVIDER_COOLDOWN_MS || 600000));
const SENTIMENT_VALUES = ['positive', 'neutral', 'negative'];
const MAX_ANALYSIS_CHARS = 120000;
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'can', 'could', 'should',
  'would', 'about', 'what', 'when', 'where', 'why', 'how', 'who', 'which', 'did', 'does', 'do',
  'i', 'you', 'we', 'they', 'he', 'she', 'them', 'our', 'your', 'their',
]);

let providerRoundRobinCursor = 0;
const providerCooldownState = {
  openai: { until: 0, reason: '' },
  gemini: { until: 0, reason: '' },
};

const isProviderConfigured = (provider) => {
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (provider === 'gemini') return Boolean(getGeminiApiKey());
  return false;
};

const isProviderCoolingDown = (provider) => Date.now() < (providerCooldownState[provider]?.until || 0);

const clearProviderCooldown = (provider) => {
  if (!providerCooldownState[provider]) return;
  providerCooldownState[provider].until = 0;
  providerCooldownState[provider].reason = '';
};

const setProviderCooldown = (provider, reason) => {
  if (!providerCooldownState[provider]) return;
  providerCooldownState[provider].until = Date.now() + AI_PROVIDER_COOLDOWN_MS;
  providerCooldownState[provider].reason = reason || 'provider_unavailable';
};

const getProviderOrder = () => {
  const configured = ['openai', 'gemini'].filter(isProviderConfigured);
  if (configured.length === 0) return [];

  let ordered;
  if (AI_PROVIDER_MODE === 'openai_primary') {
    ordered = ['openai', 'gemini'].filter((provider) => configured.includes(provider));
  } else if (AI_PROVIDER_MODE === 'gemini_primary') {
    ordered = ['gemini', 'openai'].filter((provider) => configured.includes(provider));
  } else {
    const startIndex = providerRoundRobinCursor % configured.length;
    providerRoundRobinCursor += 1;
    ordered = [...configured.slice(startIndex), ...configured.slice(0, startIndex)];
  }

  const ready = ordered.filter((provider) => !isProviderCoolingDown(provider));
  const cooling = ordered.filter((provider) => isProviderCoolingDown(provider));
  return ready.length > 0 ? [...ready, ...cooling] : ordered;
};

/**
 * Ensure OpenAI API key is configured
 * @throws {AppError} If OPENAI_API_KEY is not configured
 */
const getOpenAIApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      'OpenAI API not configured',
      503,
      'OPENAI_NOT_CONFIGURED'
    );
  }
  return apiKey;
};

const parseJsonString = (value, fallback = {}) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]);
    } catch (_nestedError) {
      return fallback;
    }
  }
};

const normalizeActionItems = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const normalizeSentiment = (value) => {
  if (typeof value !== 'string') return 'neutral';
  const normalized = value.toLowerCase().trim();
  return SENTIMENT_VALUES.includes(normalized) ? normalized : 'neutral';
};

const getTextFromCompletion = (completion) => {
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
};

const requestOpenAI = async ({ path, method = 'POST', body, headers = {} }) => {
  const apiKey = getOpenAIApiKey();
  const response = await fetch(`${OPENAI_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body,
  });

  const raw = await response.text();
  const data = raw ? parseJsonString(raw, { raw }) : {};

  if (!response.ok) {
    const errorMessage = data?.error?.message || `OpenAI request failed with status ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        'OpenAI API key is invalid or unauthorized. Update OPENAI_API_KEY in server/.env.',
        401,
        'OPENAI_AUTH_ERROR'
      );
    }

    if (response.status === 429) {
      throw new AppError(
        'OpenAI quota exceeded. Add billing/credits or use another API key.',
        429,
        'OPENAI_RATE_LIMITED'
      );
    }

    if (response.status >= 400 && response.status < 500) {
      throw new AppError(errorMessage, response.status, 'OPENAI_BAD_REQUEST');
    }

    throw new AppError(errorMessage, 502, 'OPENAI_UPSTREAM_ERROR');
  }

  return data;
};

const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;
};

const requestGeminiGenerateContent = async ({
  parts,
  responseMimeType,
  systemInstruction,
  temperature = 0.2,
}) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AppError('Gemini API not configured', 503, 'GEMINI_NOT_CONFIGURED');
  }

  const model = DEFAULT_GEMINI_MODEL;
  const url = `${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      temperature,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
    ...(systemInstruction
      ? {
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
        }
      : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  const data = raw ? parseJsonString(raw, { raw }) : {};

  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed with status ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new AppError('Gemini API key is invalid or unauthorized.', 401, 'GEMINI_AUTH_ERROR');
    }

    if (response.status === 429) {
      throw new AppError('Gemini quota exceeded. Retry later or switch providers.', 429, 'GEMINI_RATE_LIMITED');
    }

    if (response.status >= 400 && response.status < 500) {
      throw new AppError(message, response.status, 'GEMINI_BAD_REQUEST');
    }

    throw new AppError(message, 502, 'GEMINI_UPSTREAM_ERROR');
  }

  const candidateParts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateParts)) {
    const text = candidateParts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    return text;
  }

  return '';
};

const normalizeTranscriptEntries = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => ({
      speaker: typeof item?.speaker === 'string' && item.speaker.trim() ? item.speaker.trim() : 'Speaker 1',
      text: typeof item?.text === 'string' ? item.text.trim() : '',
      timestamp: Number.isFinite(item?.timestamp) ? Math.max(0, Math.round(item.timestamp)) : index * 5,
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, 2000);
};

const summarizeWithGemini = async (text, contextLabel = 'transcript') => {
  const clippedText = String(text || '').slice(0, MAX_ANALYSIS_CHARS);
  const geminiText = await requestGeminiGenerateContent({
    responseMimeType: 'application/json',
    temperature: 0.2,
    parts: [
      {
        text: `Summarize this ${contextLabel}. Return strict JSON with keys: summary (string), actionItems (array of strings), sentiment (positive|neutral|negative).\n\n${clippedText}`,
      },
    ],
  });

  if (!geminiText) {
    throw new AppError('Gemini returned an empty summary response.', 502, 'GEMINI_UPSTREAM_ERROR');
  }

  const parsed = parseJsonString(geminiText, {});
  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : 'Summary unavailable.';

  return {
    summary,
    actionItems: normalizeActionItems(parsed.actionItems),
    sentiment: normalizeSentiment(parsed.sentiment),
  };
};

const transcribeWithGemini = async ({ audioData, mimeType, fileName }) => {
  const geminiText = await requestGeminiGenerateContent({
    responseMimeType: 'application/json',
    temperature: 0.1,
    parts: [
      {
        inlineData: {
          mimeType: mimeType || 'audio/mpeg',
          data: audioData,
        },
      },
      {
        text: `Transcribe this audio (${fileName || 'audio file'}) and return strict JSON:
{
  "title": "string",
  "transcript": [{"speaker":"string","text":"string","timestamp":0}],
  "summary": "string",
  "actionItems": ["string"],
  "sentiment": "positive|neutral|negative",
  "durationSeconds": 0
}`,
      },
    ],
  });

  if (!geminiText) {
    throw new AppError('Gemini returned an empty transcription response.', 502, 'GEMINI_UPSTREAM_ERROR');
  }
  const parsed = parseJsonString(geminiText, {});
  const transcript = normalizeTranscriptEntries(parsed.transcript);
  const combinedTranscript = transcript.map((part) => `${part.speaker}: ${part.text}`).join('\n');
  const durationSeconds = Number.isFinite(parsed.durationSeconds)
    ? Math.max(1, Math.round(parsed.durationSeconds))
    : Math.max(60, transcript.length * 8);

  return {
    title:
      (typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : null) ||
      String(fileName || 'Audio').replace(/\.[^/.]+$/, ''),
    transcript,
    summary:
      (typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : combinedTranscript.slice(0, 900) || 'Transcription complete.'),
    actionItems: normalizeActionItems(parsed.actionItems),
    sentiment: normalizeSentiment(parsed.sentiment),
    durationSeconds,
  };
};

const isOpenAIUnavailableError = (error) =>
  error instanceof AppError &&
  ['OPENAI_RATE_LIMITED', 'OPENAI_AUTH_ERROR', 'OPENAI_NOT_CONFIGURED'].includes(error.code);

const isGeminiUnavailableError = (error) =>
  error instanceof AppError &&
  ['GEMINI_RATE_LIMITED', 'GEMINI_AUTH_ERROR', 'GEMINI_NOT_CONFIGURED'].includes(error.code);

const isOpenAIFailoverError = (error) =>
  isOpenAIUnavailableError(error) ||
  (error instanceof AppError && (error.code === 'OPENAI_UPSTREAM_ERROR' || error.statusCode >= 500)) ||
  !(error instanceof AppError);

const isGeminiFailoverError = (error) =>
  isGeminiUnavailableError(error) ||
  (error instanceof AppError && (error.code === 'GEMINI_UPSTREAM_ERROR' || error.statusCode >= 500)) ||
  !(error instanceof AppError);

const isProviderUnavailableError = (error) =>
  error instanceof AppError &&
  [
    'AI_NOT_CONFIGURED',
    'AI_PROVIDER_UNAVAILABLE',
    'OPENAI_RATE_LIMITED',
    'OPENAI_AUTH_ERROR',
    'OPENAI_NOT_CONFIGURED',
    'OPENAI_UPSTREAM_ERROR',
    'GEMINI_RATE_LIMITED',
    'GEMINI_AUTH_ERROR',
    'GEMINI_NOT_CONFIGURED',
    'GEMINI_UPSTREAM_ERROR',
  ].includes(error.code);

const shouldTryNextProvider = (provider, error) => {
  if (provider === 'openai') return isOpenAIFailoverError(error);
  if (provider === 'gemini') return isGeminiFailoverError(error);
  return false;
};

const runWithProviderSelection = async ({
  requestId,
  operationName,
  openaiFn,
  geminiFn,
}) => {
  const providerOrder = getProviderOrder();
  if (providerOrder.length === 0) {
    throw new AppError(
      'AI providers are not configured. Set OPENAI_API_KEY and/or GEMINI_API_KEY in server/.env.',
      503,
      'AI_NOT_CONFIGURED'
    );
  }

  let lastError = null;
  for (const provider of providerOrder) {
    const fn = provider === 'openai' ? openaiFn : geminiFn;
    if (typeof fn !== 'function') continue;

    try {
      const result = await fn();
      if (result === null || typeof result === 'undefined') {
        throw new AppError(`${provider} returned an empty result`, 502, `${provider.toUpperCase()}_UPSTREAM_ERROR`);
      }
      clearProviderCooldown(provider);
      return { result, provider };
    } catch (error) {
      lastError = error;
      if (!shouldTryNextProvider(provider, error)) throw error;

      setProviderCooldown(provider, error?.code || error?.message || 'provider_error');
      logger.warn(`${operationName}: provider failed, trying alternate provider`, {
        requestId,
        provider,
        code: error?.code,
        statusCode: error?.statusCode,
        error: error?.message,
      });
    }
  }

  if (lastError) throw lastError;
  throw new AppError('No AI provider available for this request.', 503, 'AI_PROVIDER_UNAVAILABLE');
};

const normalizeWhitespace = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const tokenizeQuestion = (question) =>
  normalizeWhitespace(question)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .slice(0, 12);

const inferSentiment = (text) => {
  const value = normalizeWhitespace(text).toLowerCase();
  const positiveHits = (value.match(/\b(good|great|excellent|success|positive|improve|benefit|win|resolved)\b/g) || []).length;
  const negativeHits = (value.match(/\b(issue|problem|risk|delay|negative|blocker|fail|failed|concern)\b/g) || []).length;
  if (positiveHits > negativeHits) return 'positive';
  if (negativeHits > positiveHits) return 'negative';
  return 'neutral';
};

const buildFallbackSummary = (transcript) => {
  const sourceText = String(transcript || '').slice(0, MAX_ANALYSIS_CHARS);
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const summary = lines.slice(0, 4).join(' ').slice(0, 900) || 'Summary unavailable.';

  const actionItems = lines
    .filter((line) => /\b(action|todo|next step|follow ?up|owner|deadline|assign|task)\b/i.test(line))
    .slice(0, 6);

  return {
    summary,
    actionItems,
    sentiment: inferSentiment(sourceText),
    fallbackMode: true,
    fallbackReason: 'providers_unavailable',
  };
};

const buildFallbackChatAnswer = (transcript, question) => {
  const sourceText = String(transcript || '').slice(0, MAX_ANALYSIS_CHARS);
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const tokens = tokenizeQuestion(question);
  const scored = lines.map((line) => {
    const lower = line.toLowerCase();
    const score = tokens.reduce((acc, token) => (lower.includes(token) ? acc + 1 : acc), 0);
    return { line, score };
  });

  const matched = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.line);

  const snippets = matched.length > 0 ? matched : lines.slice(0, 2);
  const snippetText = snippets.length > 0
    ? snippets.map((line, index) => `${index + 1}. ${line}`).join('\n')
    : 'No transcript details were available.';

  return [
    'AI providers are currently unavailable (quota/auth). Here is the best answer from local transcript context:',
    snippetText,
  ].join('\n');
};

const fallbackRefineNote = (content) =>
  String(content || '')
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .join('\n\n');

const summarizeWithOpenAI = async (text, contextLabel = 'transcript') => {
  const clippedText = String(text || '').slice(0, MAX_ANALYSIS_CHARS);
  const completion = await requestOpenAI({
    path: '/chat/completions',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You summarize business content. Always return strict JSON with: summary (string), actionItems (array of strings), sentiment (positive|neutral|negative).',
        },
        {
          role: 'user',
          content: `Summarize this ${contextLabel}. Keep it concise and practical.\n\n${clippedText}`,
        },
      ],
    }),
  });

  const parsed = parseJsonString(getTextFromCompletion(completion), {});
  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : 'Summary unavailable.';

  return {
    summary,
    actionItems: normalizeActionItems(parsed.actionItems),
    sentiment: normalizeSentiment(parsed.sentiment),
  };
};

const summarizeText = async (text, contextLabel = 'transcript', requestId = null) => {
  const clippedText = String(text || '').slice(0, MAX_ANALYSIS_CHARS);
  const { result, provider } = await runWithProviderSelection({
    requestId,
    operationName: 'summary',
    openaiFn: () => summarizeWithOpenAI(clippedText, contextLabel),
    geminiFn: () => summarizeWithGemini(clippedText, contextLabel),
  });

  return {
    ...result,
    aiProvider: provider,
  };
};

/**
 * POST /api/ai/live-session
 * Placeholder for future real-time streaming support
 */
router.post(
  '/live-session',
  asyncHandler(async (req, res) => {
    logger.info('Live session request', { requestId: req.id });

    try {
      getOpenAIApiKey();

      res.json({
        message: 'Live session endpoint currently requires a dedicated WebSocket implementation.',
        model: DEFAULT_CHAT_MODEL,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Live session error', { error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('OpenAI');
    }
  })
);

/**
 * POST /api/ai/transcribe-audio
 * Transcribe audio via selected AI provider and return meeting-style structured output
 * Body: { audioData, mimeType, fileName? }
 */
router.post(
  '/transcribe-audio',
  validateRequest(TranscribeAudioInputSchema),
  asyncHandler(async (req, res) => {
    const { audioData, mimeType, fileName } = req.body;

    logger.info('Transcription request', { fileName, requestId: req.id });

    try {
      const safeMimeType = mimeType || 'audio/mpeg';
      const extension = safeMimeType.split('/')[1]?.split(';')[0] || 'mp3';
      const safeFileName = fileName || `audio.${extension}`;

      let audioBuffer;
      try {
        audioBuffer = Buffer.from(audioData, 'base64');
      } catch (_error) {
        throw new AppError('Invalid audio payload', 400, 'INVALID_AUDIO_PAYLOAD');
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new AppError('Audio payload is empty', 400, 'EMPTY_AUDIO_PAYLOAD');
      }

      const { result, provider } = await runWithProviderSelection({
        requestId: req.id,
        operationName: 'transcription',
        openaiFn: async () => {
          const formData = new FormData();
          formData.append('file', new Blob([audioBuffer], { type: safeMimeType }), safeFileName);
          formData.append('model', DEFAULT_TRANSCRIPTION_MODEL);
          formData.append('response_format', 'verbose_json');
          formData.append('temperature', '0');

          const transcription = await requestOpenAI({
            path: '/audio/transcriptions',
            body: formData,
          });

          const rawTranscript = typeof transcription?.text === 'string' ? transcription.text.trim() : '';
          const segments = Array.isArray(transcription?.segments) ? transcription.segments : [];
          const transcript =
            segments.length > 0
              ? segments
                  .filter((segment) => typeof segment?.text === 'string' && segment.text.trim())
                  .map((segment, index) => ({
                    speaker: 'Speaker 1',
                    text: segment.text.trim(),
                    timestamp: Number.isFinite(segment.start) ? Math.max(0, Math.round(segment.start)) : index * 5,
                  }))
              : rawTranscript
                ? [{ speaker: 'Speaker 1', text: rawTranscript, timestamp: 0 }]
                : [];

          const durationSeconds = Number.isFinite(transcription?.duration)
            ? Math.max(1, Math.round(transcription.duration))
            : Math.max(60, transcript.length * 8);

          const combinedTranscript = transcript.map((part) => `${part.speaker}: ${part.text}`).join('\n');
          const summaryData = combinedTranscript
            ? await summarizeText(combinedTranscript, 'meeting transcript', req.id)
            : { summary: 'Transcription complete.', actionItems: [], sentiment: 'neutral', aiProvider: 'none' };

          return {
            title: safeFileName.replace(/\.[^/.]+$/, ''),
            transcript,
            summary: summaryData.summary,
            actionItems: summaryData.actionItems,
            sentiment: summaryData.sentiment,
            durationSeconds,
            summaryProvider: summaryData.aiProvider,
          };
        },
        geminiFn: () => transcribeWithGemini({ audioData, mimeType: safeMimeType, fileName: safeFileName }),
      });

      logger.info('Transcription successful', { fileName, requestId: req.id });

      res.json({
        ...result,
        aiProvider: provider,
      });
    } catch (error) {
      if (isProviderUnavailableError(error)) {
        throw new AppError(
          'AI transcription is unavailable because both OpenAI and Gemini are currently unavailable or out of quota.',
          503,
          'AI_TRANSCRIPTION_UNAVAILABLE'
        );
      }
      if (error instanceof AppError) throw error;
      logger.error('Transcription error', { error: error.message, requestId: req.id });
      throw new AppError('AI transcription failed', 502, 'AI_TRANSCRIPTION_ERROR');
    }
  })
);

/**
 * POST /api/ai/generate-summary
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
      const result = await summarizeText(transcript, 'meeting transcript', req.id);

      logger.info('Summary generated', { requestId: req.id });

      res.json(result);
    } catch (error) {
      if (isProviderUnavailableError(error)) {
        logger.warn('Summary fallback mode activated', {
          requestId: req.id,
          code: error.code,
          reason: error.message,
        });
        return res.json({
          ...buildFallbackSummary(transcript),
          fallbackReason: 'providers_unavailable',
        });
      }
      if (error instanceof AppError) throw error;
      logger.error('Summary generation error', { error: error.message, requestId: req.id });
      throw new AppError('AI summary generation failed', 502, 'AI_SUMMARY_ERROR');
    }
  })
);

/**
 * POST /api/ai/process-pdf
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

      // Always return useful output even when AI providers are unavailable.
      let summary = transcript.slice(0, 3).map((t) => t.text).join(' ').slice(0, 1200);
      let actionItems = [];
      let sentiment = 'neutral';
      let summaryProvider = 'none';

      try {
        const aiResult = await summarizeText(extractedText.slice(0, 120000), 'PDF document', req.id);
        if (aiResult.summary) summary = aiResult.summary;
        if (Array.isArray(aiResult.actionItems)) actionItems = aiResult.actionItems;
        if (SENTIMENT_VALUES.includes(aiResult.sentiment)) {
          sentiment = aiResult.sentiment;
        }
        if (typeof aiResult.aiProvider === 'string') {
          summaryProvider = aiResult.aiProvider;
        }
      } catch (aiError) {
        logger.warn('AI summary failed for PDF, using fallback summary', {
          requestId: req.id,
          fileName,
          code: aiError.code,
          error: aiError.message,
        });
      }

      res.json({
        title,
        summary,
        actionItems,
        sentiment,
        durationSeconds,
        transcript,
        summaryProvider,
      });

      logger.info('PDF processed', {
        fileName,
        requestId: req.id,
        transcriptChunks: transcript.length,
        summaryProvider,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('PDF processing error', { fileName, error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('AI');
    }
  })
);

/**
 * POST /api/ai/refine-note
 * Improve note text while preserving intent
 * Body: { content }
 */
router.post(
  '/refine-note',
  validateRequest(RefineNoteInputSchema),
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    logger.info('Note refinement request', { requestId: req.id });

    try {
      const { result, provider } = await runWithProviderSelection({
        requestId: req.id,
        operationName: 'refine-note',
        openaiFn: async () => {
          const completion = await requestOpenAI({
            path: '/chat/completions',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: DEFAULT_CHAT_MODEL,
              temperature: 0.4,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert editor. Rewrite notes to be clear and professional while preserving original meaning. Return only the revised note text.',
                },
                {
                  role: 'user',
                  content: content,
                },
              ],
            }),
          });

          return {
            content: getTextFromCompletion(completion) || content,
          };
        },
        geminiFn: async () => {
          const geminiText = await requestGeminiGenerateContent({
            temperature: 0.4,
            systemInstruction:
              'You are an expert editor. Rewrite notes to be clear and professional while preserving original meaning. Return only the revised note text.',
            parts: [{ text: content }],
          });

          return {
            content: (typeof geminiText === 'string' && geminiText.trim()) ? geminiText.trim() : content,
          };
        },
      });

      return res.json({
        ...result,
        aiProvider: provider,
      });
    } catch (error) {
      if (isProviderUnavailableError(error)) {
        logger.warn('All providers unavailable for note refinement, using local fallback', {
          requestId: req.id,
          code: error.code,
          reason: error.message,
        });

        return res.json({
          content: fallbackRefineNote(content),
          fallbackMode: true,
          fallbackReason: 'providers_unavailable',
        });
      }
      if (error instanceof AppError) throw error;
      logger.error('Note refinement error', { error: error.message, requestId: req.id });
      throw new AppError('AI note refinement failed', 502, 'AI_NOTE_REFINEMENT_ERROR');
    }
  })
);

/**
 * POST /api/ai/chat
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
      const clippedTranscript = String(transcript || '').slice(0, MAX_ANALYSIS_CHARS);
      const chatPrompt = `Transcript:\n${clippedTranscript}\n\nQuestion:\n${question}`;
      const systemInstruction =
        'You are a professional assistant analyzing meeting recordings. Use transcript evidence, be concise, and say clearly when details are missing.';

      const { result, provider } = await runWithProviderSelection({
        requestId: req.id,
        operationName: 'chat',
        openaiFn: async () => {
          const completion = await requestOpenAI({
            path: '/chat/completions',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: DEFAULT_CHAT_MODEL,
              temperature: 0.3,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: chatPrompt },
              ],
            }),
          });

          return {
            answer: getTextFromCompletion(completion) || "I'm sorry, I couldn't process that.",
          };
        },
        geminiFn: async () => {
          const geminiAnswer = await requestGeminiGenerateContent({
            temperature: 0.3,
            systemInstruction,
            parts: [{ text: chatPrompt }],
          });

          return {
            answer:
              (typeof geminiAnswer === 'string' && geminiAnswer.trim())
                ? geminiAnswer.trim()
                : "I'm sorry, I couldn't process that.",
          };
        },
      });

      logger.info('Chat response sent', { requestId: req.id });

      res.json({
        ...result,
        aiProvider: provider,
      });
    } catch (error) {
      if (isProviderUnavailableError(error)) {
        logger.warn('All providers unavailable for chat, using local fallback', {
          requestId: req.id,
          code: error.code,
          reason: error.message,
        });

        return res.json({
          answer: buildFallbackChatAnswer(transcript, question),
          fallbackMode: true,
          fallbackReason: 'providers_unavailable',
        });
      }
      if (error instanceof AppError) throw error;
      logger.error('Chat error', { error: error.message, requestId: req.id });
      throw new AppError('AI chat failed', 502, 'AI_CHAT_ERROR');
    }
  })
);

export default router;

