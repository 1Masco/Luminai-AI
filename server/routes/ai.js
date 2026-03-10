import express from 'express';
import { Blob } from 'buffer';
import { validateRequest } from '../validation/middleware.js';
import {
  TranscribeAudioInputSchema,
  GenerateSummaryInputSchema,
  ChatInputSchema,
  ProcessPDFInputSchema,
  RefineNoteInputSchema,
  AnalyzeMeetingInputSchema,
  GenerateFollowUpInputSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { getRuntimeValue } from '../services/adminSettings.js';

const router = express.Router();
const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const DEFAULT_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const DEEPGRAM_API_BASE_URL = 'https://api.deepgram.com/v1';
const DEFAULT_DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || 'nova-2';
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
  deepgram: { until: 0, reason: '' },
  openai: { until: 0, reason: '' },
  gemini: { until: 0, reason: '' },
};

const isProviderConfigured = (provider) => {
  if (provider === 'deepgram') return Boolean(getRuntimeValue('DEEPGRAM_API_KEY'));
  if (provider === 'openai') return Boolean(getRuntimeValue('OPENAI_API_KEY'));
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
  const configured = ['deepgram', 'openai', 'gemini'].filter(isProviderConfigured);
  if (configured.length === 0) return [];

  let ordered;
  if (AI_PROVIDER_MODE === 'openai_primary') {
    ordered = ['openai', 'deepgram', 'gemini'].filter((p) => configured.includes(p));
  } else if (AI_PROVIDER_MODE === 'gemini_primary') {
    ordered = ['gemini', 'deepgram', 'openai'].filter((p) => configured.includes(p));
  } else if (AI_PROVIDER_MODE === 'deepgram_primary') {
    ordered = ['deepgram', 'openai', 'gemini'].filter((p) => configured.includes(p));
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
  const apiKey = getRuntimeValue('OPENAI_API_KEY');
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
        'OpenAI API key is invalid or unauthorized. Update it in the Admin Dashboard or server/.env.',
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
  const apiKey = getRuntimeValue('GEMINI_API_KEY');
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

/**
 * Deepgram Nova-2 transcription with native speaker diarization
 * Uses the Deepgram REST API directly (no SDK required)
 */
const transcribeWithDeepgram = async ({ audioBuffer, mimeType, fileName, language = 'en' }) => {
  const apiKey = getRuntimeValue('DEEPGRAM_API_KEY');
  if (!apiKey) {
    throw new AppError('Deepgram API not configured', 503, 'DEEPGRAM_NOT_CONFIGURED');
  }

  const params = new URLSearchParams({
    model: DEFAULT_DEEPGRAM_MODEL,
    diarize: 'true',          // speaker detection: Speaker 0, Speaker 1, ...
    punctuate: 'true',        // adds proper sentence punctuation
    smart_format: 'true',     // formats numbers, dates, etc.
    utterances: 'true',       // groups by speaker utterances
    paragraphs: 'true',       // natural paragraph breaks
    filler_words: 'false',    // remove ums/uhs
    language,                 // auto or specific language code
  });

  const url = `${DEEPGRAM_API_BASE_URL}/listen?${params}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/webm',
    },
    body: audioBuffer,
  });

  const raw = await response.text();
  const data = raw ? parseJsonString(raw, {}) : {};

  if (!response.ok) {
    const errMsg = data?.err_msg || data?.message || `Deepgram request failed with status ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new AppError('Deepgram API key is invalid or unauthorized. Update it in the Admin Dashboard or server/.env.', 401, 'DEEPGRAM_AUTH_ERROR');
    }
    if (response.status === 402) {
      throw new AppError('Deepgram quota exceeded. Falling back to next provider.', 429, 'DEEPGRAM_RATE_LIMITED');
    }
    throw new AppError(errMsg, 502, 'DEEPGRAM_UPSTREAM_ERROR');
  }

  // Parse Deepgram's utterance-based diarized output
  const utterances = Array.isArray(data?.results?.utterances) ? data.results.utterances : [];
  const channels = data?.results?.channels || [];
  const rawTranscript = channels?.[0]?.alternatives?.[0]?.transcript || '';
  const durationSeconds = Math.round(data?.metadata?.duration || Math.max(60, utterances.length * 5));

  let transcript = [];
  if (utterances.length > 0) {
    // Use proper diarized utterances — who said what
    transcript = utterances.map((u, idx) => ({
      speaker: `Speaker ${(u.speaker ?? idx) + 1}`,
      text: (u.transcript || '').trim(),
      timestamp: Math.round(u.start || idx * 5),
    })).filter(u => u.text.length > 0);
  } else if (rawTranscript) {
    // Fallback: single-speaker plain transcript
    transcript = [{ speaker: 'Speaker 1', text: rawTranscript.trim(), timestamp: 0 }];
  }

  return { transcript, durationSeconds, rawTranscript };
};

const isDeepgramUnavailableError = (error) =>
  error instanceof AppError &&
  ['DEEPGRAM_RATE_LIMITED', 'DEEPGRAM_AUTH_ERROR', 'DEEPGRAM_NOT_CONFIGURED'].includes(error.code);

const isDeepgramFailoverError = (error) =>
  isDeepgramUnavailableError(error) ||
  (error instanceof AppError && (error.code === 'DEEPGRAM_UPSTREAM_ERROR' || error.statusCode >= 500)) ||
  !(error instanceof AppError);

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
    'DEEPGRAM_RATE_LIMITED',
    'DEEPGRAM_AUTH_ERROR',
    'DEEPGRAM_NOT_CONFIGURED',
    'DEEPGRAM_UPSTREAM_ERROR',
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
  if (provider === 'deepgram') return isDeepgramFailoverError(error);
  if (provider === 'openai') return isOpenAIFailoverError(error);
  if (provider === 'gemini') return isGeminiFailoverError(error);
  return false;
};

const runWithProviderSelection = async ({
  requestId,
  operationName,
  deepgramFn,
  openaiFn,
  geminiFn,
}) => {
  const providerOrder = getProviderOrder();
  if (providerOrder.length === 0) {
    throw new AppError(
      'AI providers are not configured. Set keys in the Admin Dashboard or server/.env.',
      503,
      'AI_NOT_CONFIGURED'
    );
  }

  let lastError = null;
  for (const provider of providerOrder) {
    const fn = provider === 'deepgram' ? deepgramFn : provider === 'openai' ? openaiFn : geminiFn;
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
 * Transcribe audio using Deepgram Nova-2 (primary, with diarization) or Whisper (fallback) or Gemini
 * Body: { audioData, mimeType, fileName? }
 */
router.post(
  '/transcribe-audio',
  validateRequest(TranscribeAudioInputSchema),
  asyncHandler(async (req, res) => {
    const { audioData, mimeType, fileName } = req.body;

    logger.info('Transcription request', { fileName, mimeType, requestId: req.id });

    try {
      const safeMimeType = mimeType || 'audio/webm';
      const extension = safeMimeType.split('/')[1]?.split(';')[0] || 'webm';
      const safeFileName = fileName || `recording.${extension}`;

      let audioBuffer;
      try {
        audioBuffer = Buffer.from(audioData, 'base64');
      } catch (_error) {
        throw new AppError('Invalid audio payload', 400, 'INVALID_AUDIO_PAYLOAD');
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new AppError('Audio payload is empty', 400, 'EMPTY_AUDIO_PAYLOAD');
      }

      // ── Deepgram transcription helper ──────────────────────────────────────
      const runDeepgramTranscription = async () => {
        const { transcript, durationSeconds, rawTranscript } = await transcribeWithDeepgram({
          audioBuffer,
          mimeType: safeMimeType,
          fileName: safeFileName,
          language: req.body.language || 'en',
        });

        const combinedTranscript = transcript.map((p) => `${p.speaker}: ${p.text}`).join('\n');
        const summaryData = combinedTranscript
          ? await summarizeText(combinedTranscript, 'meeting transcript', req.id)
          : { summary: 'Transcription complete.', actionItems: [], sentiment: 'neutral', aiProvider: 'none' };

        // Generate a smart title from the transcript
        let title = safeFileName.replace(/\.[^/.]+$/, '');
        if (combinedTranscript.length > 50) {
          try {
            const titleResult = await requestGeminiGenerateContent({
              temperature: 0.3,
              parts: [{ text: `Generate a short (3-6 word) meeting title from this transcript. Return ONLY the title, no quotes:\n\n${combinedTranscript.slice(0, 1000)}` }],
            });
            if (titleResult && titleResult.trim().length > 2) {
              title = titleResult.trim().replace(/^["']|["']$/g, '');
            }
          } catch (_e) { /* keep filename-based title */ }
        }

        return {
          title,
          transcript,
          summary: summaryData.summary,
          actionItems: summaryData.actionItems,
          sentiment: summaryData.sentiment,
          durationSeconds,
          transcriptionProvider: 'deepgram',
          summaryProvider: summaryData.aiProvider,
          speakerCount: new Set(transcript.map(t => t.speaker)).size,
        };
      };

      // ── Whisper transcription helper (with GPT speaker inference) ──────────
      const runWhisperTranscription = async () => {
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: safeMimeType }), safeFileName);
        formData.append('model', DEFAULT_TRANSCRIPTION_MODEL);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'segment');
        formData.append('temperature', '0');

        const transcription = await requestOpenAI({ path: '/audio/transcriptions', body: formData });

        const rawTranscript = typeof transcription?.text === 'string' ? transcription.text.trim() : '';
        const segments = Array.isArray(transcription?.segments) ? transcription.segments : [];

        // Build initial transcript (single speaker)
        let transcript = segments.length > 0
          ? segments
            .filter((s) => typeof s?.text === 'string' && s.text.trim())
            .map((s, idx) => ({
              speaker: 'Speaker 1',
              text: s.text.trim(),
              timestamp: Number.isFinite(s.start) ? Math.max(0, Math.round(s.start)) : idx * 5,
            }))
          : rawTranscript ? [{ speaker: 'Speaker 1', text: rawTranscript, timestamp: 0 }] : [];

        const durationSeconds = Number.isFinite(transcription?.duration)
          ? Math.max(1, Math.round(transcription.duration))
          : Math.max(60, transcript.length * 8);

        // ── GPT speaker diarization inference ──
        // Ask GPT to infer speaker names/labels from context
        if (transcript.length > 1 && getRuntimeValue('OPENAI_API_KEY')) {
          try {
            const numberedLines = transcript.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
            const diarizationPrompt = [
              'You are a meeting transcript analyst. Given the transcript lines below, infer which lines likely belong to different speakers.',
              'Assign speaker labels like "Alex", "Sarah", "Host", "Guest", etc. based on context clues (questions vs answers, topic shifts, etc.).',
              'Return ONLY a JSON array like: [{"line": 1, "speaker": "Alex"}, ...]',
              'Every line must have an entry. Use 2-4 distinct speaker names.',
              '',
              'Transcript:',
              numberedLines,
            ].join('\n');

            const completion = await requestOpenAI({
              path: '/chat/completions',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: DEFAULT_CHAT_MODEL,
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: 'Return JSON with key "diarization" containing an array of {line, speaker} objects.' },
                  { role: 'user', content: diarizationPrompt },
                ],
              }),
            });

            const parsed = parseJsonString(getTextFromCompletion(completion), {});
            const diarization = Array.isArray(parsed.diarization) ? parsed.diarization : [];
            if (diarization.length > 0) {
              const speakerMap = {};
              diarization.forEach(({ line, speaker }) => { speakerMap[line] = speaker; });
              transcript = transcript.map((t, i) => ({
                ...t,
                speaker: speakerMap[i + 1] || t.speaker,
              }));
            }
          } catch (diarizationErr) {
            logger.warn('Speaker diarization inference failed, using single-speaker', { error: diarizationErr.message, requestId: req.id });
          }
        }

        const combinedTranscript = transcript.map((p) => `${p.speaker}: ${p.text}`).join('\n');
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
          transcriptionProvider: 'whisper',
          summaryProvider: summaryData.aiProvider,
          speakerCount: new Set(transcript.map(t => t.speaker)).size,
        };
      };

      // ── Provider waterfall: Deepgram → Whisper → Gemini ───────────────────
      const { result, provider } = await runWithProviderSelection({
        requestId: req.id,
        operationName: 'transcription',
        deepgramFn: isProviderConfigured('deepgram') ? runDeepgramTranscription : undefined,
        openaiFn: isProviderConfigured('openai') ? runWhisperTranscription : undefined,
        geminiFn: () => transcribeWithGemini({ audioData, mimeType: safeMimeType, fileName: safeFileName }),
      });

      logger.info('Transcription successful', {
        fileName,
        transcriptionProvider: result.transcriptionProvider || provider,
        speakerCount: result.speakerCount,
        requestId: req.id,
      });

      res.json({ ...result, aiProvider: provider });

    } catch (error) {
      if (isProviderUnavailableError(error)) {
        throw new AppError(
          'AI transcription is unavailable. Please set provider keys in the Admin Dashboard or server/.env.',
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

/**
 * POST /api/ai/analyze-meeting
 * AI Meeting Coach — analyze transcript for talk-time, filler words,
 * speaking pace, per-speaker sentiment, health score, and coaching tips.
 * Body: { transcript: TranscriptPart[], duration?: number }
 */
router.post(
  '/analyze-meeting',
  validateRequest(AnalyzeMeetingInputSchema),
  asyncHandler(async (req, res) => {
    const { transcript, duration } = req.body;

    logger.info('Meeting coach analysis request', { requestId: req.id, parts: transcript.length });

    try {
      // ── 1. Talk-time per speaker (local computation) ──────────────────────
      const speakerWordCounts = {};
      const speakerTexts = {};
      const FILLER_PATTERNS = /\b(um|uh|erm|ah|like|you know|i mean|basically|actually|literally|sort of|kind of|right|okay so)\b/gi;

      transcript.forEach(part => {
        const speaker = part.speaker || 'Unknown';
        const text = (part.text || '').trim();
        const words = text.split(/\s+/).filter(Boolean);

        if (!speakerWordCounts[speaker]) {
          speakerWordCounts[speaker] = 0;
          speakerTexts[speaker] = [];
        }
        speakerWordCounts[speaker] += words.length;
        speakerTexts[speaker].push(text);
      });

      const totalWords = Object.values(speakerWordCounts).reduce((a, b) => a + b, 0);
      const totalDurationSec = duration || Math.max(60, totalWords / 2.5); // ~150 wpm avg

      const talkTime = {};
      for (const [speaker, wordCount] of Object.entries(speakerWordCounts)) {
        const pct = totalWords > 0 ? Math.round((wordCount / totalWords) * 100) : 0;
        const seconds = Math.round((pct / 100) * totalDurationSec);
        talkTime[speaker] = { seconds, percentage: pct, wordCount };
      }

      // ── 2. Filler words per speaker (local computation) ──────────────────
      const fillerWords = {};
      for (const [speaker, texts] of Object.entries(speakerTexts)) {
        const combined = texts.join(' ');
        const matches = combined.match(FILLER_PATTERNS) || [];
        const fillerCounts = {};
        matches.forEach(m => {
          const key = m.toLowerCase().trim();
          fillerCounts[key] = (fillerCounts[key] || 0) + 1;
        });
        fillerWords[speaker] = { ...fillerCounts, total: matches.length };
      }

      // ── 3. Speaking pace per speaker (local computation) ─────────────────
      const speakingPace = {};
      for (const [speaker, wordCount] of Object.entries(speakerWordCounts)) {
        const speakerSec = (talkTime[speaker]?.seconds || 60);
        const wpm = Math.round((wordCount / speakerSec) * 60);
        let rating = 'moderate';
        if (wpm < 110) rating = 'slow';
        else if (wpm > 170) rating = 'fast';
        speakingPace[speaker] = { wordsPerMinute: wpm, rating };
      }

      // ── 4. Per-speaker sentiment + coaching tips (AI-powered) ────────────
      let speakerSentiment = {};
      let coachTips = [];

      // Build summary context for AI
      const speakerSummaryLines = Object.entries(talkTime)
        .map(([s, d]) => `${s}: ${d.percentage}% talk-time, ${d.wordCount} words, ${fillerWords[s]?.total || 0} fillers, ${speakingPace[s]?.wordsPerMinute || 0} WPM`)
        .join('\n');

      const combinedTranscript = transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');
      const contextPrompt = [
        'Analyze this meeting transcript. For each speaker, determine their sentiment (positive, neutral, or negative).',
        'Also provide 3-5 actionable coaching tips to improve future meetings.',
        'Consider: talk-time balance, filler word usage, speaking pace, engagement, and overall meeting productivity.',
        '',
        'Speaker stats:',
        speakerSummaryLines,
        '',
        'Transcript (first 6000 chars):',
        combinedTranscript.slice(0, 6000),
        '',
        'Return strict JSON: { "speakerSentiment": { "Speaker Name": "positive|neutral|negative", ... }, "coachTips": ["tip 1", "tip 2", ...] }',
      ].join('\n');

      try {
        const { result: aiResult } = await runWithProviderSelection({
          requestId: req.id,
          operationName: 'meeting-coach',
          openaiFn: async () => {
            const completion = await requestOpenAI({
              path: '/chat/completions',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: DEFAULT_CHAT_MODEL,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: 'You are a professional meeting coach. Return strict JSON only.' },
                  { role: 'user', content: contextPrompt },
                ],
              }),
            });
            return parseJsonString(getTextFromCompletion(completion), {});
          },
          geminiFn: async () => {
            const geminiText = await requestGeminiGenerateContent({
              temperature: 0.2,
              responseMimeType: 'application/json',
              systemInstruction: 'You are a professional meeting coach. Return strict JSON only.',
              parts: [{ text: contextPrompt }],
            });
            return parseJsonString(geminiText, {});
          },
        });

        if (aiResult.speakerSentiment && typeof aiResult.speakerSentiment === 'object') {
          speakerSentiment = aiResult.speakerSentiment;
        }
        if (Array.isArray(aiResult.coachTips)) {
          coachTips = aiResult.coachTips.filter(t => typeof t === 'string').slice(0, 6);
        }
      } catch (aiError) {
        logger.warn('AI coach analysis failed, using local fallback', {
          requestId: req.id,
          code: aiError?.code,
          error: aiError?.message,
        });

        // Fallback: infer sentiment locally
        for (const [speaker, texts] of Object.entries(speakerTexts)) {
          speakerSentiment[speaker] = inferSentiment(texts.join(' '));
        }

        // Fallback: generate basic tips
        const speakers = Object.keys(talkTime);
        const maxTalker = speakers.reduce((a, b) => (talkTime[a].percentage > talkTime[b].percentage ? a : b), speakers[0]);
        if (talkTime[maxTalker]?.percentage > 60) {
          coachTips.push(`${maxTalker} dominated ${talkTime[maxTalker].percentage}% of talk-time. Encourage others to contribute more.`);
        }
        const highFillerSpeaker = speakers.find(s => (fillerWords[s]?.total || 0) > 10);
        if (highFillerSpeaker) {
          coachTips.push(`${highFillerSpeaker} used ${fillerWords[highFillerSpeaker].total} filler words. Try pausing instead of using fillers.`);
        }
        if (coachTips.length === 0) {
          coachTips.push('Good meeting! Consider setting a timer to keep discussions focused.');
        }
      }

      // ── 5. Health Score (composite from all factors) ─────────────────────
      const speakers = Object.keys(talkTime);
      const percentages = speakers.map(s => talkTime[s].percentage);
      const idealPct = 100 / Math.max(speakers.length, 1);
      const balanceDeviation = percentages.reduce((sum, p) => sum + Math.abs(p - idealPct), 0) / Math.max(speakers.length, 1);
      const balanceScore = Math.max(0, 100 - balanceDeviation * 2);

      const totalFillers = Object.values(fillerWords).reduce((s, f) => s + (f.total || 0), 0);
      const fillerWordScore = Math.max(0, 100 - totalFillers * 2);

      const avgWpm = speakers.length > 0
        ? speakers.reduce((s, sp) => s + (speakingPace[sp]?.wordsPerMinute || 140), 0) / speakers.length
        : 140;
      const paceScore = avgWpm >= 120 && avgWpm <= 160 ? 100 : Math.max(0, 100 - Math.abs(avgWpm - 140) * 1.5);

      const sentimentValues = Object.values(speakerSentiment);
      const positivePct = sentimentValues.filter(s => s === 'positive').length / Math.max(sentimentValues.length, 1);
      const negativePct = sentimentValues.filter(s => s === 'negative').length / Math.max(sentimentValues.length, 1);
      const sentimentScore = Math.round((positivePct * 100) + ((1 - negativePct) * 100)) / 2;

      const engagementLevel = speakers.length >= 3 ? 'high' : speakers.length === 2 ? 'moderate' : 'low';

      const healthScore = Math.round(
        (balanceScore * 0.25) +
        (fillerWordScore * 0.20) +
        (paceScore * 0.25) +
        (sentimentScore * 0.30)
      );

      const analytics = {
        talkTime,
        fillerWords,
        speakingPace,
        speakerSentiment,
        healthScore: Math.min(100, Math.max(0, healthScore)),
        healthFactors: {
          balanced: balanceDeviation < 15,
          engagementLevel,
          balanceScore: Math.round(balanceScore),
          fillerWordScore: Math.round(fillerWordScore),
          paceScore: Math.round(paceScore),
          sentimentScore: Math.round(sentimentScore),
        },
        coachTips,
        analyzedAt: new Date().toISOString(),
      };

      logger.info('Meeting coach analysis complete', {
        requestId: req.id,
        healthScore: analytics.healthScore,
        speakers: speakers.length,
      });

      res.json(analytics);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Meeting coach analysis error', { error: error.message, requestId: req.id });
      throw new AppError('Meeting coach analysis failed', 502, 'AI_COACH_ERROR');
    }
  })
);

/**
 * POST /api/ai/generate-follow-up
 * Smart Follow-Up Engine — extract assigned actions, detect deadlines,
 * identify key decisions, and generate a follow-up email.
 * Body: { transcript: TranscriptPart[], title?: string }
 */
router.post(
  '/generate-follow-up',
  validateRequest(GenerateFollowUpInputSchema),
  asyncHandler(async (req, res) => {
    const { transcript, title } = req.body;

    logger.info('Follow-up generation request', { requestId: req.id, parts: transcript.length });

    try {
      const combinedTranscript = transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');
      const speakers = [...new Set(transcript.map(p => p.speaker))];

      // ── 1. Local deadline detection (regex, always runs) ─────────────
      const DEADLINE_PATTERNS = [
        /\b(by|before|until|due|deadline)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|end of (?:day|week|month)|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)\b/gi,
        /\b((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)\b/gi,
        /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))\b/gi,
        /\b(end of (?:day|week|month|quarter|year))\b/gi,
      ];

      const deadlinesDetected = [];
      transcript.forEach(part => {
        const text = part.text || '';
        DEADLINE_PATTERNS.forEach(pattern => {
          const regex = new RegExp(pattern.source, pattern.flags);
          let match;
          while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0].trim();
            // Get surrounding context (40 chars each side)
            const idx = text.indexOf(fullMatch);
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + fullMatch.length + 40);
            const context = text.slice(start, end).trim();

            // Deduplicate by text
            if (!deadlinesDetected.some(d => d.text === fullMatch && d.speaker === part.speaker)) {
              deadlinesDetected.push({
                text: fullMatch,
                context: context,
                speaker: part.speaker,
              });
            }
          }
        });
      });

      // ── 2. AI-powered extraction (actions, decisions, email) ───────
      let assignedActions = [];
      let keyDecisions = [];
      let followUpEmail = { subject: '', body: '' };

      const prompt = [
        `Analyze this meeting transcript titled "${title || 'Meeting'}" and extract:`,
        '',
        '1. **assignedActions**: An array of action items. For each, identify:',
        '   - task: what needs to be done (clear, concise)',
        '   - assignee: the speaker responsible (use exact speaker names from transcript)',
        '   - deadline: any mentioned deadline (e.g. "Friday", "next week", "March 15") or "none"',
        '   - priority: "high", "medium", or "low" based on urgency cues',
        '',
        '2. **keyDecisions**: Array of key decisions made during the meeting (strings)',
        '',
        '3. **followUpEmail**: A professional follow-up email with:',
        '   - subject: concise email subject line',
        '   - body: professional email body summarizing the meeting, listing action items with owners and deadlines',
        '',
        `Speakers in this meeting: ${speakers.join(', ')}`,
        '',
        'Return strict JSON with keys: assignedActions, keyDecisions, followUpEmail',
        '',
        'Transcript:',
        combinedTranscript.slice(0, 8000),
      ].join('\n');

      try {
        const { result: aiResult } = await runWithProviderSelection({
          requestId: req.id,
          operationName: 'follow-up',
          openaiFn: async () => {
            const completion = await requestOpenAI({
              path: '/chat/completions',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: DEFAULT_CHAT_MODEL,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: 'You are a professional executive assistant. Extract action items, decisions, and draft follow-up emails. Return strict JSON only.' },
                  { role: 'user', content: prompt },
                ],
              }),
            });
            return parseJsonString(getTextFromCompletion(completion), {});
          },
          geminiFn: async () => {
            const geminiText = await requestGeminiGenerateContent({
              temperature: 0.2,
              responseMimeType: 'application/json',
              systemInstruction: 'You are a professional executive assistant. Extract action items, decisions, and draft follow-up emails. Return strict JSON only.',
              parts: [{ text: prompt }],
            });
            return parseJsonString(geminiText, {});
          },
        });

        // Parse assigned actions
        if (Array.isArray(aiResult.assignedActions)) {
          assignedActions = aiResult.assignedActions
            .filter(a => a && typeof a.task === 'string')
            .map(a => ({
              task: a.task.trim(),
              assignee: (typeof a.assignee === 'string' ? a.assignee.trim() : 'Unassigned'),
              deadline: (typeof a.deadline === 'string' ? a.deadline.trim() : 'none'),
              priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
            }))
            .slice(0, 15);
        }

        // Parse key decisions
        if (Array.isArray(aiResult.keyDecisions)) {
          keyDecisions = aiResult.keyDecisions
            .filter(d => typeof d === 'string' && d.trim())
            .map(d => d.trim())
            .slice(0, 10);
        }

        // Parse follow-up email
        if (aiResult.followUpEmail && typeof aiResult.followUpEmail === 'object') {
          followUpEmail = {
            subject: typeof aiResult.followUpEmail.subject === 'string' ? aiResult.followUpEmail.subject.trim() : `Follow-up: ${title}`,
            body: typeof aiResult.followUpEmail.body === 'string' ? aiResult.followUpEmail.body.trim() : '',
          };
        }
      } catch (aiError) {
        logger.warn('AI follow-up generation failed, using local fallback', {
          requestId: req.id,
          code: aiError?.code,
          error: aiError?.message,
        });

        // Fallback: extract action-like lines from transcript
        transcript.forEach(part => {
          const text = (part.text || '').trim();
          if (/\b(will|should|need to|must|going to|action|todo|follow[- ]?up|assign|task|responsible)\b/i.test(text)) {
            assignedActions.push({
              task: text.slice(0, 200),
              assignee: part.speaker,
              deadline: 'none',
              priority: 'medium',
            });
          }
        });
        assignedActions = assignedActions.slice(0, 10);

        followUpEmail = {
          subject: `Follow-up: ${title || 'Meeting'}`,
          body: `Hi team,\n\nThank you for attending today's meeting.\n\nHere are the key action items:\n${assignedActions.map((a, i) => `${i + 1}. ${a.task} (${a.assignee})`).join('\n')}\n\nBest regards`,
        };
      }

      const followUpData = {
        assignedActions,
        keyDecisions,
        followUpEmail,
        deadlinesDetected: deadlinesDetected.slice(0, 10),
        generatedAt: new Date().toISOString(),
      };

      logger.info('Follow-up generated', {
        requestId: req.id,
        actions: assignedActions.length,
        decisions: keyDecisions.length,
        deadlines: deadlinesDetected.length,
      });

      res.json(followUpData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Follow-up generation error', { error: error.message, requestId: req.id });
      throw new AppError('Follow-up generation failed', 502, 'AI_FOLLOWUP_ERROR');
    }
  })
);

export default router;
