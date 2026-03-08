import express from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../validation/middleware.js';
import {
  TranslateMeetingInputSchema,
  CrossMeetingChatInputSchema,
  SaveVoiceMemoInputSchema,
  UpdateVoiceMemoInputSchema,
  CategorizeMemoInputSchema,
  MeetingPrepInputSchema,
  CreateTemplateInputSchema,
  UpdateTemplateInputSchema,
  GenerateWithTemplateInputSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

// =============================================
// Helper: get the AI text generation function from the main ai.js
// We import ai routes and use the same pattern
// =============================================
const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_ANALYSIS_CHARS = 120000;

const parseJsonString = (text, fallback = {}) => {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
};

const getOpenAIApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AppError('OpenAI API not configured', 503, 'OPENAI_NOT_CONFIGURED');
  return apiKey;
};

const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;
};

const requestOpenAI = async ({ messages, temperature = 0.3, jsonMode = true }) => {
  const apiKey = getOpenAIApiKey();
  const body = {
    model: DEFAULT_CHAT_MODEL,
    temperature,
    messages,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };

  const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  const data = raw ? parseJsonString(raw, { raw }) : {};

  if (!response.ok) {
    const errorMessage = data?.error?.message || `OpenAI request failed (${response.status})`;
    throw new AppError(errorMessage, response.status >= 500 ? 502 : response.status, 'OPENAI_ERROR');
  }

  const text = data?.choices?.[0]?.message?.content || '';
  return jsonMode ? parseJsonString(text, {}) : text;
};

const requestGemini = async ({ prompt, systemInstruction, temperature = 0.3 }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new AppError('Gemini API not configured', 503, 'GEMINI_NOT_CONFIGURED');

  const url = `${GEMINI_API_BASE_URL}/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, responseMimeType: 'application/json' },
    ...(systemInstruction ? { system_instruction: { parts: [{ text: systemInstruction }] } } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  const data = raw ? parseJsonString(raw, {}) : {};

  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed (${response.status})`;
    throw new AppError(message, response.status >= 500 ? 502 : response.status, 'GEMINI_ERROR');
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || '';
  return parseJsonString(text, {});
};

// Try OpenAI first, fall back to Gemini
const aiRequest = async ({ messages, prompt, systemInstruction, temperature = 0.3, requestId }) => {
  // Try OpenAI
  try {
    if (process.env.OPENAI_API_KEY) {
      return await requestOpenAI({ messages, temperature });
    }
  } catch (err) {
    logger.warn('OpenAI failed, trying Gemini', { requestId, error: err.message });
  }

  // Try Gemini
  try {
    if (getGeminiApiKey()) {
      const geminiPrompt = prompt || messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      return await requestGemini({ prompt: geminiPrompt, systemInstruction, temperature });
    }
  } catch (err) {
    logger.warn('Gemini also failed', { requestId, error: err.message });
  }

  throw new AppError('No AI provider available', 503, 'AI_NOT_CONFIGURED');
};

// =============================================
// 1. MULTI-LANGUAGE TRANSLATION
// =============================================

/**
 * POST /translate
 * Translate a meeting transcript to a target language
 */
router.post(
  '/translate',
  authenticateToken,
  validateRequest(TranslateMeetingInputSchema),
  asyncHandler(async (req, res) => {
    const { meetingId, languageCode, languageName, transcript, summary } = req.body;
    const userId = req.user.id;

    logger.info('Translation request', { meetingId, languageCode, requestId: req.id });

    const clippedTranscript = String(transcript).slice(0, MAX_ANALYSIS_CHARS);

    const result = await aiRequest({
      requestId: req.id,
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the meeting transcript to ${languageName} (${languageCode}). 
Return strict JSON with:
- translatedTranscript: array of {id, speaker, text, originalText, timestamp} where text is the translation and originalText is the original
- translatedSummary: translated summary string (only if summary provided)

Keep speaker names unchanged. Maintain the same meaning and tone. Format timestamps as numbers.`,
        },
        {
          role: 'user',
          content: `Translate to ${languageName}:\n\nTRANSCRIPT:\n${clippedTranscript}${summary ? `\n\nSUMMARY:\n${summary}` : ''}`,
        },
      ],
      prompt: `Translate to ${languageName}. Return JSON with translatedTranscript (array of {id, speaker, text, originalText, timestamp}) and translatedSummary.\n\n${clippedTranscript}`,
      systemInstruction: `Professional translator. Translate to ${languageName}. Return JSON.`,
    });

    // Parse the translated transcript
    let translatedTranscript = [];
    if (Array.isArray(result.translatedTranscript)) {
      translatedTranscript = result.translatedTranscript.map((t, i) => ({
        id: t.id || `t-${i}`,
        speaker: t.speaker || 'Speaker',
        text: t.text || '',
        originalText: t.originalText || '',
        timestamp: typeof t.timestamp === 'number' ? t.timestamp : i * 5,
      }));
    }

    // Save to database
    let savedTranslation = null;
    if (isSupabaseConfigured() && meetingId) {
      try {
        const { data, error } = await supabase
          .from('meeting_translations')
          .upsert({
            meeting_id: meetingId,
            language_code: languageCode,
            language_name: languageName,
            translated_transcript: translatedTranscript,
            translated_summary: result.translatedSummary || null,
            status: 'completed',
            user_id: userId,
          }, { onConflict: 'meeting_id,language_code' })
          .select()
          .single();

        if (!error) savedTranslation = data;
      } catch (dbErr) {
        logger.warn('Failed to save translation to DB', { error: dbErr.message });
      }
    }

    logger.info('Translation completed', { meetingId, languageCode, segments: translatedTranscript.length, requestId: req.id });

    res.json({
      translatedTranscript,
      translatedSummary: result.translatedSummary || null,
      translation: savedTranslation,
    });
  })
);

/**
 * GET /translations/:meetingId
 * Get all translations for a meeting
 */
router.get(
  '/translations/:meetingId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { meetingId } = req.params;

    if (!isSupabaseConfigured()) {
      return res.json({ translations: [] });
    }

    const { data: translations, error } = await supabase
      .from('meeting_translations')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('Failed to fetch translations', { meetingId, error: error.message });
      return res.json({ translations: [] });
    }

    res.json({ translations: translations || [] });
  })
);

// =============================================
// 2. AI CROSS-MEETING CHAT
// =============================================

/**
 * POST /cross-meeting-chat
 * Semantic search and chat across all meetings
 */
router.post(
  '/cross-meeting-chat',
  authenticateToken,
  validateRequest(CrossMeetingChatInputSchema),
  asyncHandler(async (req, res) => {
    const { question, meetings, conversationId, history } = req.body;
    const userId = req.user.id;

    logger.info('Cross-meeting chat', { question: question.slice(0, 100), meetingCount: meetings.length, requestId: req.id });

    // Build context from meetings (limit to avoid token overflow)
    const meetingContext = meetings.slice(0, 15).map(m => {
      const transcriptSnippet = (m.transcript || '').slice(0, 3000);
      return `MEETING: "${m.title}" (${m.date})\nSUMMARY: ${m.summary || 'No summary'}\nACTION ITEMS: ${(m.actionItems || []).join('; ') || 'None'}\nTRANSCRIPT EXCERPT: ${transcriptSnippet}`;
    }).join('\n\n---\n\n');

    const conversationHistory = Array.isArray(history) ? history.slice(-10) : [];
    const historyMessages = conversationHistory.map(h => ({
      role: h.role,
      content: h.content,
    }));

    const messages = [
      {
        role: 'system',
        content: `You are Lumina AI, an intelligent meeting assistant. You have access to the user's meeting history below.
Answer questions by analyzing all available meetings. Identify patterns, trends, unresolved items, and decisions.
When referencing specific meetings, include their title and date.
Return strict JSON with:
- response: your answer (string, can use markdown formatting)
- meetingReferences: array of meeting IDs that are relevant to your answer
- conversationTitle: a short title for this conversation (max 50 chars)

MEETING DATA:
${meetingContext}`,
      },
      ...historyMessages,
      {
        role: 'user',
        content: question,
      },
    ];

    const result = await aiRequest({
      requestId: req.id,
      messages,
      prompt: `${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`,
      systemInstruction: 'Intelligent meeting assistant. Analyze meetings and answer questions. Return JSON with response, meetingReferences, conversationTitle.',
    });

    const responseText = result.response || result.answer || 'I could not find relevant information in your meetings.';
    const meetingReferences = Array.isArray(result.meetingReferences) ? result.meetingReferences : [];
    const conversationTitle = result.conversationTitle || question.slice(0, 50);

    // Save to database
    let savedConversationId = conversationId;
    if (isSupabaseConfigured()) {
      try {
        if (!conversationId) {
          // Create new conversation
          const { data: conv } = await supabase
            .from('ai_chat_conversations')
            .insert({
              title: conversationTitle,
              meeting_ids: meetingReferences,
              user_id: userId,
            })
            .select()
            .single();
          if (conv) savedConversationId = conv.id;
        }

        if (savedConversationId) {
          // Save user message
          await supabase.from('ai_chat_messages').insert({
            conversation_id: savedConversationId,
            role: 'user',
            content: question,
          });

          // Save assistant message
          await supabase.from('ai_chat_messages').insert({
            conversation_id: savedConversationId,
            role: 'assistant',
            content: responseText,
            meeting_references: meetingReferences,
          });
        }
      } catch (dbErr) {
        logger.warn('Failed to save chat to DB', { error: dbErr.message });
      }
    }

    res.json({
      response: responseText,
      meetingReferences,
      conversationId: savedConversationId,
      conversationTitle,
    });
  })
);

/**
 * GET /chat-conversations
 * List all chat conversations
 */
router.get(
  '/chat-conversations',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json({ conversations: [] });
    }

    const userId = req.user.id;
    const { data, error } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    res.json({ conversations: data || [] });
  })
);

/**
 * GET /chat-conversations/:id/messages
 * Get messages for a conversation
 */
router.get(
  '/chat-conversations/:id/messages',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isSupabaseConfigured()) {
      return res.json({ messages: [] });
    }

    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    res.json({ messages: data || [] });
  })
);

// =============================================
// 3. VOICE MEMOS
// =============================================

/**
 * GET /voice-memos
 * Get all voice memos
 */
router.get(
  '/voice-memos',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json({ memos: [] });
    }

    const userId = req.user.id;
    const { data, error } = await supabase
      .from('voice_memos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    res.json({ memos: data || [] });
  })
);

/**
 * POST /voice-memos
 * Save a new voice memo
 */
router.post(
  '/voice-memos',
  authenticateToken,
  validateRequest(SaveVoiceMemoInputSchema),
  asyncHandler(async (req, res) => {
    const { title, transcription, duration, category, linkedMeetingId, tags, isQuickCapture } = req.body;
    const userId = req.user.id;

    if (!isSupabaseConfigured()) {
      return res.json({ memo: { id: `memo-${Date.now()}`, ...req.body } });
    }

    const { data: memo, error } = await supabase
      .from('voice_memos')
      .insert({
        user_id: userId,
        title: title || 'Voice Memo',
        transcription,
        duration: duration || 0,
        category: category || 'general',
        linked_meeting_id: linkedMeetingId || null,
        tags: tags || [],
        is_quick_capture: isQuickCapture || false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save voice memo', { error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    res.status(201).json({ memo });
  })
);

/**
 * PUT /voice-memos/:id
 * Update a voice memo
 */
router.put(
  '/voice-memos/:id',
  authenticateToken,
  validateRequest(UpdateVoiceMemoInputSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, category, tags, linkedMeetingId } = req.body;

    if (!isSupabaseConfigured()) {
      return res.json({ memo: { id, ...req.body } });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (linkedMeetingId !== undefined) updates.linked_meeting_id = linkedMeetingId;

    const userId = req.user.id;
    const { data: memo, error } = await supabase
      .from('voice_memos')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw AppErrors.NOT_FOUND('Voice memo');
    }

    res.json({ memo });
  })
);

/**
 * DELETE /voice-memos/:id
 */
router.delete(
  '/voice-memos/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (isSupabaseConfigured()) {
      await supabase.from('voice_memos').delete().eq('id', id).eq('user_id', userId);
    }

    res.json({ message: 'Voice memo deleted' });
  })
);

/**
 * POST /categorize-memo
 * AI auto-categorize a voice memo transcription
 */
router.post(
  '/categorize-memo',
  authenticateToken,
  validateRequest(CategorizeMemoInputSchema),
  asyncHandler(async (req, res) => {
    const { transcription, meetings } = req.body;

    logger.info('Categorizing memo', { requestId: req.id });

    const meetingsList = (meetings || []).slice(0, 20).map(m => `- ${m.title} (ID: ${m.id})`).join('\n');

    const result = await aiRequest({
      requestId: req.id,
      messages: [
        {
          role: 'system',
          content: `You categorize voice memos. Return strict JSON with:
- category: one of "standup", "idea", "todo", "general"
- title: a short descriptive title (max 60 chars)
- tags: array of 1-5 relevant keyword tags
- linkedMeetingId: ID of the most related meeting from the list (or null if none match)

Available meetings:\n${meetingsList || 'No meetings available'}`,
        },
        {
          role: 'user',
          content: `Categorize this voice memo:\n\n${transcription.slice(0, 5000)}`,
        },
      ],
      prompt: `Categorize this voice memo. Return JSON with category, title, tags, linkedMeetingId.\n\n${transcription.slice(0, 5000)}`,
      systemInstruction: 'Categorize voice memos into standup/idea/todo/general. Return JSON.',
    });

    res.json({
      category: result.category || 'general',
      title: result.title || 'Voice Memo',
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      linkedMeetingId: result.linkedMeetingId || null,
    });
  })
);

// =============================================
// 4. SMART MEETING PREP
// =============================================

/**
 * POST /meeting-prep
 * Generate a prep brief for an upcoming meeting
 */
router.post(
  '/meeting-prep',
  authenticateToken,
  validateRequest(MeetingPrepInputSchema),
  asyncHandler(async (req, res) => {
    const { meetingTitle, relatedMeetings } = req.body;
    const userId = req.user.id;

    logger.info('Generating meeting prep', { meetingTitle, relatedCount: relatedMeetings?.length, requestId: req.id });

    const meetingData = (relatedMeetings || []).slice(0, 10).map(m => {
      return `MEETING: "${m.title}" (${m.date})\nSUMMARY: ${(m.summary || '').slice(0, 2000)}\nACTION ITEMS: ${(m.actionItems || []).join('; ') || 'None'}\nTRANSCRIPT: ${(m.transcript || '').slice(0, 2000)}`;
    }).join('\n\n---\n\n');

    const result = await aiRequest({
      requestId: req.id,
      messages: [
        {
          role: 'system',
          content: `You are a meeting preparation assistant. Based on past meetings related to "${meetingTitle}", generate a comprehensive prep brief.
Return strict JSON with:
- lastDiscussed: array of strings — key points from previous meetings
- unresolvedActions: array of strings — action items that appear unresolved or still pending
- suggestedAgenda: array of strings — recommended agenda items for the upcoming meeting
- contextCards: array of {topic: string, summary: string, date: string, meetingId: string} — "Last time you discussed..." cards

Be specific and actionable. Focus on continuity from past meetings.`,
        },
        {
          role: 'user',
          content: `Generate a prep brief for upcoming "${meetingTitle}" based on these past meetings:\n\n${meetingData || 'No related meetings found.'}`,
        },
      ],
      prompt: `Generate prep brief for "${meetingTitle}". Return JSON with lastDiscussed, unresolvedActions, suggestedAgenda, contextCards.\n\n${meetingData}`,
      systemInstruction: 'Meeting prep assistant. Generate comprehensive prep briefs from past meetings. Return JSON.',
    });

    const briefContent = {
      lastDiscussed: Array.isArray(result.lastDiscussed) ? result.lastDiscussed : [],
      unresolvedActions: Array.isArray(result.unresolvedActions) ? result.unresolvedActions : [],
      suggestedAgenda: Array.isArray(result.suggestedAgenda) ? result.suggestedAgenda : [],
      contextCards: Array.isArray(result.contextCards) ? result.contextCards.map(c => ({
        topic: c.topic || '',
        summary: c.summary || '',
        date: c.date || '',
        meetingId: c.meetingId || null,
      })) : [],
    };

    // Save to database
    let savedBrief = null;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('meeting_prep_briefs')
          .insert({
            user_id: userId,
            meeting_title: meetingTitle,
            related_meeting_ids: (relatedMeetings || []).map(m => m.id),
            brief_content: briefContent,
            generated_for_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (data) savedBrief = data;
      } catch (dbErr) {
        logger.warn('Failed to save prep brief to DB', { error: dbErr.message });
      }
    }

    logger.info('Meeting prep generated', {
      meetingTitle,
      lastDiscussed: briefContent.lastDiscussed.length,
      unresolvedActions: briefContent.unresolvedActions.length,
      suggestedAgenda: briefContent.suggestedAgenda.length,
      requestId: req.id,
    });

    res.json({ briefContent, brief: savedBrief });
  })
);

/**
 * GET /meeting-prep
 * Get all saved prep briefs
 */
router.get(
  '/meeting-prep',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json({ briefs: [] });
    }

    const userId = req.user.id;
    const { data, error } = await supabase
      .from('meeting_prep_briefs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ briefs: data || [] });
  })
);

/**
 * DELETE /meeting-prep/:id
 */
router.delete(
  '/meeting-prep/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (isSupabaseConfigured()) {
      await supabase.from('meeting_prep_briefs').delete().eq('id', id).eq('user_id', userId);
    }

    res.json({ message: 'Prep brief deleted' });
  })
);

// =============================================
// 5. CUSTOM AI TEMPLATES
// =============================================

/**
 * GET /templates
 * Get all templates (user's own + shared + system)
 */
router.get(
  '/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json({ templates: [] });
    }

    const userId = req.user.id;
    // Get user's own templates + shared + system templates
    const { data, error } = await supabase
      .from('ai_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true,is_system.eq.true`)
      .order('usage_count', { ascending: false });

    res.json({ templates: data || [] });
  })
);

/**
 * POST /templates
 * Create a new template
 */
router.post(
  '/templates',
  authenticateToken,
  validateRequest(CreateTemplateInputSchema),
  asyncHandler(async (req, res) => {
    const { name, description, category, promptTemplate, outputFormat, isShared } = req.body;
    const userId = req.user.id;

    if (!isSupabaseConfigured()) {
      return res.json({ template: { id: `template-${Date.now()}`, ...req.body } });
    }

    const { data: template, error } = await supabase
      .from('ai_templates')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        category: category || 'custom',
        prompt_template: promptTemplate,
        output_format: outputFormat || 'markdown',
        is_shared: isShared || false,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create template', { error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    res.status(201).json({ template });
  })
);

/**
 * PUT /templates/:id
 * Update a template
 */
router.put(
  '/templates/:id',
  authenticateToken,
  validateRequest(UpdateTemplateInputSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, category, promptTemplate, outputFormat, isShared } = req.body;
    const userId = req.user.id;

    if (!isSupabaseConfigured()) {
      return res.json({ template: { id, ...req.body } });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (promptTemplate !== undefined) updates.prompt_template = promptTemplate;
    if (outputFormat !== undefined) updates.output_format = outputFormat;
    if (isShared !== undefined) updates.is_shared = isShared;

    const { data: template, error } = await supabase
      .from('ai_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw AppErrors.NOT_FOUND('AI Template');
    }

    res.json({ template });
  })
);

/**
 * DELETE /templates/:id
 */
router.delete(
  '/templates/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (isSupabaseConfigured()) {
      await supabase.from('ai_templates').delete().eq('id', id).eq('user_id', userId).eq('is_system', false);
    }

    res.json({ message: 'Template deleted' });
  })
);

/**
 * POST /generate-with-template
 * Generate summary using a custom template
 */
router.post(
  '/generate-with-template',
  authenticateToken,
  validateRequest(GenerateWithTemplateInputSchema),
  asyncHandler(async (req, res) => {
    const { transcript, templatePrompt, outputFormat } = req.body;

    logger.info('Generating with custom template', { requestId: req.id });

    const clippedTranscript = String(transcript).slice(0, MAX_ANALYSIS_CHARS);

    const formatInstructions = outputFormat === 'bullet_points'
      ? 'Format your response as bullet points.'
      : outputFormat === 'structured'
        ? 'Format your response as a structured document with clear headers and sections.'
        : 'Format your response in markdown.';

    const result = await aiRequest({
      requestId: req.id,
      messages: [
        {
          role: 'system',
          content: `You are an AI meeting summarizer. Follow the user's template instructions precisely. ${formatInstructions}
Return strict JSON with:
- summary: the formatted summary following the template (string)
- actionItems: array of action items extracted (array of strings)
- sentiment: overall sentiment (positive|neutral|negative)`,
        },
        {
          role: 'user',
          content: `Using this template:\n\n${templatePrompt}\n\nSummarize this transcript:\n\n${clippedTranscript}`,
        },
      ],
      prompt: `Template: ${templatePrompt}\n\nTranscript: ${clippedTranscript}\n\nReturn JSON with summary, actionItems, sentiment.`,
      systemInstruction: `Meeting summarizer. Follow template precisely. Return JSON.`,
    });

    // Increment usage count if template ID provided
    if (req.body.templateId && isSupabaseConfigured()) {
      try {
        await supabase.rpc('increment_template_usage', { template_id: req.body.templateId });
      } catch {
        // Non-critical
      }
    }

    res.json({
      summary: result.summary || 'Summary unavailable.',
      actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
      sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment) ? result.sentiment : 'neutral',
    });
  })
);

export default router;
