-- Add onboarding_completed_at to user_profiles
-- When set, user has completed the 5-step onboarding flow

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'When user completed the 5-step onboarding flow; null = not completed or skipped';
