-- Add onboarding tracking fields for forced interactive tutorial (Code Purple 3.0)
-- Ensures onboarding_completed_at exists (from 051) and adds step tracking

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tutorial_skipped BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'When user completed the 5-step onboarding flow; null = not completed or skipped';
COMMENT ON COLUMN user_profiles.onboarding_step IS '0=goal, 1=morning, 2=evening, 3=complete';
COMMENT ON COLUMN user_profiles.tutorial_skipped IS 'When true, user skipped the forced tutorial';

-- Add index for quick checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding 
ON user_profiles(onboarding_completed_at, onboarding_step);

-- Set existing users as completed (they already used the app)
UPDATE user_profiles 
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at),
    onboarding_step = 3
WHERE onboarding_completed_at IS NULL OR onboarding_step IS NULL OR onboarding_step < 3;
