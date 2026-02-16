-- Founder Profile Fields
-- Comprehensive profile data for personalization

-- Open text fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_goal_text TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS destress_activity TEXT;

-- Hobbies (array) + other
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hobbies TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hobbies_other TEXT;

-- Message to Mrs. Deer (personal introduction)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS message_to_mrs_deer TEXT;

-- Stage with other
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS founder_stage TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS founder_stage_other TEXT;

-- Role with other
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_role_other TEXT;

-- Hours
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weekly_hours TEXT;

-- Struggles (array) + other
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS struggles TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS struggles_other TEXT;

-- Years
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS years_as_founder TEXT;

-- Personality + other
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS founder_personality TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS founder_personality_other TEXT;

-- Preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_digest BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'daily';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- Update primary_goal constraint to include build_significance
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_primary_goal_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_primary_goal_check CHECK (primary_goal IN (
  'find_purpose',           -- Looking for purpose/motivation
  'build_significance',     -- Building a meaningful business
  'reduce_overwhelm',       -- Drowned in many small tasks, can't multitask
  'break_through_stuck',    -- Doing everything but still feel stuck
  'improve_focus',          -- Need better focus/clarity
  'build_systems',          -- Want to systemize and delegate better
  'general_clarity',        -- General clarity/decision-making (default)
  'stay_motivated',         -- Know what to do but struggle with consistency
  'find_calm'               -- Productive but never feel settled or at peace
));
