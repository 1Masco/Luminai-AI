-- =============================================
-- Admin Settings + Action Log
-- =============================================

-- Stores admin-managed secrets and settings
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Stores admin UI actions for audit/history
CREATE TABLE IF NOT EXISTS admin_actions (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actor_id UUID
);

-- Stores custom API key definitions for the admin dashboard
CREATE TABLE IF NOT EXISTS admin_key_definitions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
