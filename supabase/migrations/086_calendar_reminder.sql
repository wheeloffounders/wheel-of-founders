-- Add calendar reminder columns to user_profiles

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS calendar_reminder_time TIME,
  ADD COLUMN IF NOT EXISTS calendar_reminder_type TEXT; -- 'google' | 'apple' | 'outlook' | 'other'

CREATE INDEX IF NOT EXISTS idx_user_profiles_calendar_reminder
  ON user_profiles (calendar_reminder_time)
  WHERE calendar_reminder_time IS NOT NULL;

