-- Fix morning_tasks table to support is_proactive and nullable needle_mover
-- Run this in Supabase SQL Editor

-- 1. Add is_proactive column if it doesn't exist
ALTER TABLE morning_tasks 
ADD COLUMN IF NOT EXISTS is_proactive BOOLEAN;

-- 2. Ensure needle_mover allows NULL (remove NOT NULL constraint if it exists)
-- Note: BOOLEAN columns can be NULL by default, but let's be explicit
ALTER TABLE morning_tasks 
ALTER COLUMN needle_mover DROP NOT NULL;

-- 3. Ensure action_plan constraint matches the code values
-- Drop existing constraint if it exists
ALTER TABLE morning_tasks
DROP CONSTRAINT IF EXISTS morning_tasks_action_plan_check;

-- Add correct constraint matching ACTION_PLAN_OPTIONS_2
ALTER TABLE morning_tasks
ADD CONSTRAINT morning_tasks_action_plan_check
CHECK (action_plan IS NULL OR action_plan IN ('my_zone', 'systemize', 'delegate_founder', 'eliminate_founder', 'quick_win_founder'));

-- 4. Ensure completed column exists (should already exist from migration 008)
ALTER TABLE morning_tasks
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- 5. Add comments for clarity
COMMENT ON COLUMN morning_tasks.is_proactive IS 'true = Proactive (user initiated), false = Reactive (response to something), NULL = Not set';
COMMENT ON COLUMN morning_tasks.needle_mover IS 'true = Will change trajectory, false = Maintains status quo, NULL = Not set';
COMMENT ON COLUMN morning_tasks.action_plan IS 'Founder action plan: my_zone, systemize, delegate_founder, eliminate_founder, quick_win_founder';

-- 6. Verify the table structure
-- This will show you all columns and their types
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'morning_tasks'
ORDER BY ordinal_position;
