-- User Goals and Preferences for Personalization
-- This allows the app to adapt language and approach based on user's primary goal

-- Add user_goals column to user_profiles (stores primary goal)
-- Note: If you've already run migration 022, use migration 023 to update the constraint
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS primary_goal TEXT;

-- Add constraint (will be updated by migration 023 if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_primary_goal_check'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_primary_goal_check CHECK (primary_goal IN (
      'find_purpose',           -- Looking for purpose/motivation
      'reduce_overwhelm',       -- Drowned in many small tasks, can't multitask
      'break_through_stuck',    -- Doing everything but still feel stuck
      'improve_focus',          -- Need better focus/clarity
      'build_systems',          -- Want to systemize and delegate better
      'general_clarity',        -- General clarity/decision-making (default)
      'stay_motivated',         -- Know what to do but struggle with consistency
      'find_calm'               -- Productive but never feel settled or at peace
    ));
  END IF;
END $$;

-- Add secondary_goals JSONB array for multiple selections (optional)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS secondary_goals JSONB DEFAULT '[]'::jsonb;

-- Add questionnaire_completed_at timestamp
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS questionnaire_completed_at TIMESTAMPTZ;

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_goal ON user_profiles(primary_goal);
