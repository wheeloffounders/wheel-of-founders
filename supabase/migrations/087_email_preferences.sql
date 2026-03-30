-- Email preferences stored as JSONB on user_profiles + email_logs table

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{
    "onboarding": true,
    "weekly_digest": true,
    "inactivity_reminders": true,
    "nurture_emails": true,
    "marketing_updates": false
  }'::jsonb;

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g. 'inactivity_reminder_7d'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_type
  ON email_logs (user_id, type, sent_at);

