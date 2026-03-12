-- Add has_seen_morning_tour for first-time user guided flow
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_seen_morning_tour BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.has_seen_morning_tour IS 'When true, user has seen the morning page tour/highlight; only show once';
