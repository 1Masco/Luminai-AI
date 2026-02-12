-- Add OAuth token storage columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_tokens JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS outlook_tokens JSONB;

-- Add indexes for faster token lookups
CREATE INDEX IF NOT EXISTS profiles_google_tokens_idx ON profiles USING GIN (google_tokens);
CREATE INDEX IF NOT EXISTS profiles_outlook_tokens_idx ON profiles USING GIN (outlook_tokens);
