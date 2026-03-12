-- Add missing onboarding columns (repair if 065 wasn't applied)
-- Run in Supabase SQL Editor if onboarding_step / onboarding_completed_at are missing

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.onboarding_step IS '0=goal, 1=morning, 2=evening, 3=complete';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'When user completed the forced tutorial; null = not completed';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding
ON user_profiles(onboarding_step, onboarding_completed_at);

-- Backfill existing users who have engaged (goal or questionnaire)
UPDATE user_profiles
SET
  onboarding_step = 3,
  onboarding_completed_at = COALESCE(onboarding_completed_at, questionnaire_completed_at, created_at, now())
WHERE onboarding_completed_at IS NULL
  AND (
    (primary_goal_text IS NOT NULL AND trim(primary_goal_text) != '')
    OR questionnaire_completed_at IS NOT NULL
  );
