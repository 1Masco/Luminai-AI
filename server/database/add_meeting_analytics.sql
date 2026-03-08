-- =============================================
-- Add meeting_analytics column for AI Meeting Coach
-- Stores talk-time, filler words, speaking pace,
-- speaker sentiment, health score, and coach tips
-- =============================================

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_analytics JSONB DEFAULT NULL;

-- Add an index for querying meetings that have analytics
CREATE INDEX IF NOT EXISTS meetings_analytics_idx
  ON meetings USING gin (meeting_analytics)
  WHERE meeting_analytics IS NOT NULL;

-- =============================================
-- Add follow_up_data column for Smart Follow-Up Engine
-- Stores assigned actions, deadlines, key decisions,
-- and generated follow-up email
-- =============================================

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS follow_up_data JSONB DEFAULT NULL;
