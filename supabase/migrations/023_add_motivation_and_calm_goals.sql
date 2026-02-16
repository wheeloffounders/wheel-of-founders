-- Add two new goal options: stay_motivated and find_calm
-- This migration updates the CHECK constraint to include the new options

-- Drop the existing constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_primary_goal_check;

-- Re-add the constraint with the new options
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
