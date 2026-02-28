-- Add hide_onboarding to user_profiles
-- When true, user has opted out of onboarding/welcome popups (persists across devices)

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS hide_onboarding BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.hide_onboarding IS 'When true, do not show onboarding wizard or questionnaire popups; set by "Don''t show again" checkbox';
