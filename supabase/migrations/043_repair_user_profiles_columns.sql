-- Repair migration: Ensure all user_profiles columns exist
-- Fixes 400 errors: "column user_profiles.weekly_email_enabled does not exist" etc.
-- Run this in Supabase SQL Editor if migrations were applied out of order or schema is incomplete

-- Email & notification preferences (from 010, 013, 039)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS welcome_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS export_notification_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS community_insights_enabled BOOLEAN DEFAULT true;

-- Timezone (from 016)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ;

-- Planning mode (from 031)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS planning_mode TEXT DEFAULT 'full';

-- Update existing rows with defaults where null
UPDATE user_profiles SET weekly_email_enabled = true WHERE weekly_email_enabled IS NULL;
UPDATE user_profiles SET welcome_email_enabled = true WHERE welcome_email_enabled IS NULL;
UPDATE user_profiles SET export_notification_enabled = true WHERE export_notification_enabled IS NULL;
UPDATE user_profiles SET community_insights_enabled = true WHERE community_insights_enabled IS NULL;
UPDATE user_profiles SET timezone = 'UTC' WHERE timezone IS NULL;
UPDATE user_profiles SET timezone_offset = 0 WHERE timezone_offset IS NULL;
UPDATE user_profiles SET planning_mode = 'full' WHERE planning_mode IS NULL;
