-- Allow unlimited tasks: drop 3-task max constraint
-- Run in Supabase SQL Editor if you already ran 001_morning_tables.sql

ALTER TABLE morning_tasks DROP CONSTRAINT IF EXISTS morning_tasks_task_order_check;
ALTER TABLE morning_tasks ADD CONSTRAINT morning_tasks_task_order_positive CHECK (task_order >= 1);
