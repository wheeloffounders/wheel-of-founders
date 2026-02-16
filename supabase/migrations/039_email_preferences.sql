-- Add transactional email preferences to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS welcome_email_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS export_notification_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_profiles.welcome_email_enabled IS 'Opt-in for welcome email after signup';
COMMENT ON COLUMN user_profiles.export_notification_enabled IS 'Opt-in for export ready notification emails';
