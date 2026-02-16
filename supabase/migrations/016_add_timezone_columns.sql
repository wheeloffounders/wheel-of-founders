-- Wheel of Founders: Add Timezone Support
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0, -- in minutes, e.g., -480 for PST
ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone ON user_profiles(timezone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_analyzed ON user_profiles(last_analyzed_at);

-- Update existing users to UTC if timezone is null
UPDATE user_profiles 
SET timezone = 'UTC', timezone_offset = 0 
WHERE timezone IS NULL OR timezone_offset IS NULL;
