-- supabase/migrations/006_alter_action_plan_option1.sql
-- Run this in Supabase SQL Editor if you choose OPTION 1 (Action-Focused)

ALTER TABLE morning_tasks
DROP CONSTRAINT IF EXISTS morning_tasks_preventability_check;

ALTER TABLE morning_tasks
ADD COLUMN IF NOT EXISTS action_plan TEXT;

UPDATE morning_tasks
SET action_plan = preventability
WHERE preventability IS NOT NULL;

ALTER TABLE morning_tasks
DROP COLUMN IF EXISTS preventability;

ALTER TABLE morning_tasks
ADD CONSTRAINT morning_tasks_action_plan_check
CHECK (action_plan IN ('do_now', 'batch_later', 'delegate', 'skip_for_now'));