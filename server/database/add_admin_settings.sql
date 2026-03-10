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
