-- Run these in Supabase SQL Editor to diagnose onboarding issues

-- 1. Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('onboarding_step', 'onboarding_completed_at', 'questionnaire_completed_at', 'primary_goal_text', 'has_seen_morning_tour')
ORDER BY column_name;

-- 2. Check RLS policies on user_profiles
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 3. Sample a user's profile (replace USER_ID with actual UUID from console)
-- SELECT id, primary_goal_text, onboarding_completed_at, questionnaire_completed_at, onboarding_step, created_at
-- FROM user_profiles
-- WHERE id = 'USER_ID';

-- 4. Backfill existing users - mark as onboarding complete so they skip the forced tutorial
-- (Uncomment and run to fix "tutorial showing for existing users")
/*
UPDATE user_profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at),
    onboarding_step = 3,
    updated_at = now()
WHERE onboarding_completed_at IS NULL
  AND (
    (primary_goal_text IS NOT NULL AND trim(primary_goal_text) != '')
    OR questionnaire_completed_at IS NOT NULL
    OR created_at < now() - interval '1 day'
  );
*/
