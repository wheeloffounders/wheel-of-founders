-- supabase/migrations/007_alter_action_plan_option2.sql (FURTHER REVISED)
-- Run this in Supabase SQL Editor if you choose OPTION 2 (Founder-Focused)
-- This version handles cases where 'preventability' column might already be dropped
-- AND where the new 'action_plan_check' constraint might already exist.

ALTER TABLE morning_tasks
DROP CONSTRAINT IF EXISTS morning_tasks_preventability_check; -- Drop old constraint if it still exists

-- Add the new 'action_plan' column if it doesn't exist yet.
-- If 'action_plan' already exists from a previous migration (e.g., 006), this will do nothing.
ALTER TABLE morning_tasks
ADD COLUMN IF NOT EXISTS action_plan TEXT;

-- Safely drop 'preventability' if it still exists
ALTER TABLE morning_tasks
DROP COLUMN IF EXISTS preventability;

-- Drop the 'action_plan_check' constraint if it already exists, before re-adding.
-- This ensures we can update the CHECK values correctly if they were from a different option.
ALTER TABLE morning_tasks
DROP CONSTRAINT IF EXISTS morning_tasks_action_plan_check;

ALTER TABLE morning_tasks
ADD CONSTRAINT morning_tasks_action_plan_check
CHECK (action_plan IN ('my_zone', 'systemize', 'delegate_founder', 'eliminate_founder', 'quick_win_founder'));