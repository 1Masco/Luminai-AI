-- =============================================
-- Database Migration: New Features
-- Multi-Language Translation, AI Chat, Voice Memos,
-- Smart Meeting Prep, Custom AI Templates
-- =============================================

-- =============================================
-- 1. MEETING TRANSLATIONS TABLE
-- Stores translated transcripts per meeting/language
-- =============================================
CREATE TABLE IF NOT EXISTS meeting_translations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  language_code TEXT NOT NULL, -- BCP-47: 'es', 'fr', 'de', 'ja', etc.
  language_name TEXT NOT NULL, -- 'Spanish', 'French', etc.
  translated_transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  translated_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE meeting_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own translations"
  ON meeting_translations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own translations"
  ON meeting_translations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own translations"
  ON meeting_translations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own translations"
  ON meeting_translations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS translations_meeting_id_idx ON meeting_translations(meeting_id);
CREATE INDEX IF NOT EXISTS translations_user_id_idx ON meeting_translations(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS translations_meeting_lang_idx ON meeting_translations(meeting_id, language_code);

-- Trigger for updated_at
CREATE TRIGGER update_meeting_translations_updated_at
  BEFORE UPDATE ON meeting_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. AI CHAT CONVERSATIONS TABLE
-- Stores cross-meeting AI chat sessions
-- =============================================
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  meeting_ids UUID[] DEFAULT '{}', -- which meetings are in context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx ON ai_chat_conversations(user_id);

CREATE TRIGGER update_ai_chat_conversations_updated_at
  BEFORE UPDATE ON ai_chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- AI CHAT MESSAGES TABLE
-- Individual messages in a chat conversation
-- =============================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  meeting_references UUID[] DEFAULT '{}', -- meetings referenced in answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON ai_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON ai_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_id_idx ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON ai_chat_messages(user_id);

-- =============================================
-- 3. VOICE MEMOS TABLE
-- Quick voice recordings that get auto-transcribed
-- =============================================
CREATE TABLE IF NOT EXISTS voice_memos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Voice Memo',
  transcription TEXT,
  duration INTEGER NOT NULL DEFAULT 0, -- seconds
  category TEXT DEFAULT 'general', -- 'standup', 'idea', 'todo', 'general'
  linked_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_quick_capture BOOLEAN DEFAULT false, -- "morning standup" mode
  audio_url TEXT, -- optional stored audio reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memos"
  ON voice_memos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memos"
  ON voice_memos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memos"
  ON voice_memos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memos"
  ON voice_memos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_category_idx ON voice_memos(category);
CREATE INDEX IF NOT EXISTS voice_memos_linked_meeting_idx ON voice_memos(linked_meeting_id);

CREATE TRIGGER update_voice_memos_updated_at
  BEFORE UPDATE ON voice_memos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. MEETING PREP BRIEFS TABLE
-- AI-generated prep briefs for recurring meetings
-- =============================================
CREATE TABLE IF NOT EXISTS meeting_prep_briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meeting_title TEXT NOT NULL, -- recurring meeting title pattern
  related_meeting_ids UUID[] DEFAULT '{}',
  brief_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- brief_content structure:
  -- { lastDiscussed: string[], unresolvedActions: string[], suggestedAgenda: string[], contextCards: {topic, summary, date}[] }
  generated_for_date TIMESTAMP WITH TIME ZONE, -- the date of the upcoming meeting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE meeting_prep_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefs"
  ON meeting_prep_briefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefs"
  ON meeting_prep_briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own briefs"
  ON meeting_prep_briefs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS meeting_prep_user_id_idx ON meeting_prep_briefs(user_id);

-- =============================================
-- 5. CUSTOM AI TEMPLATES TABLE
-- User/team prompt templates for summaries
-- =============================================
CREATE TABLE IF NOT EXISTS ai_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom', -- 'sales', 'standup', '1on1', 'interview', 'legal', 'medical', 'education', 'custom'
  prompt_template TEXT NOT NULL, -- The actual prompt instructions
  output_format TEXT DEFAULT 'markdown', -- 'markdown', 'bullet_points', 'structured'
  is_shared BOOLEAN DEFAULT false, -- shared with team
  is_system BOOLEAN DEFAULT false, -- built-in system template
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE ai_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates + shared templates + system templates
CREATE POLICY "Users can view accessible templates"
  ON ai_templates FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true OR is_system = true);

CREATE POLICY "Users can insert own templates"
  ON ai_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON ai_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON ai_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

CREATE INDEX IF NOT EXISTS ai_templates_user_id_idx ON ai_templates(user_id);
CREATE INDEX IF NOT EXISTS ai_templates_category_idx ON ai_templates(category);
CREATE INDEX IF NOT EXISTS ai_templates_shared_idx ON ai_templates(is_shared) WHERE is_shared = true;

CREATE TRIGGER update_ai_templates_updated_at
  BEFORE UPDATE ON ai_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Add detected_language column to meetings
-- for auto-detection of language switches
-- =============================================
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS detected_languages TEXT[] DEFAULT '{"en"}';

-- =============================================
-- 6. FUNCTION: Increment template usage count
-- Called via supabase.rpc('increment_template_usage')
-- =============================================
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_templates
  SET usage_count = usage_count + 1,
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = template_id;
END;
$$;
