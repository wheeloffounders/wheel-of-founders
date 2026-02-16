-- Wheel of Founders: Add Tier and Pro Features Columns
-- Run this in Supabase SQL Editor

-- Add tier column (default 'beta' for existing users)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'beta' CHECK (tier IN ('beta', 'free', 'pro', 'pro_plus'));

-- Add pro_features_enabled column (default TRUE for beta period)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS pro_features_enabled BOOLEAN DEFAULT TRUE;

-- Set all existing users to beta tier with pro features enabled
UPDATE user_profiles
SET tier = 'beta', pro_features_enabled = TRUE
WHERE tier IS NULL OR pro_features_enabled IS NULL;

-- Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);
