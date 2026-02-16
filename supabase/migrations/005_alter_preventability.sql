-- Wheel of Founders: Alter morning_tasks preventability options
-- Run this in Supabase SQL Editor

ALTER TABLE morning_tasks
DROP CONSTRAINT IF EXISTS morning_tasks_preventability_check;

ALTER TABLE morning_tasks
ADD CONSTRAINT morning_tasks_preventability_check
CHECK (preventability IN ('my_zone', 'batch_systemize', 'delegate', 'eliminate', 'quick_win'));
