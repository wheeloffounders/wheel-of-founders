-- supabase/migrations/009_add_follow_up_fields_to_tasks.sql
-- Run this in Supabase SQL Editor

ALTER TABLE morning_tasks
ADD COLUMN IF NOT EXISTS systemize_follow_up_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS systemize_follow_up_template_created TEXT,
ADD COLUMN IF NOT EXISTS systemize_follow_up_next_step TEXT,
ADD COLUMN IF NOT EXISTS delegate_follow_up_assigned_to TEXT,
ADD COLUMN IF NOT EXISTS delegate_follow_up_due_date DATE,
ADD COLUMN IF NOT EXISTS delegate_follow_up_check_in_date DATE,
ADD COLUMN IF NOT EXISTS delegate_follow_up_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reminded TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_status TEXT CHECK (follow_up_status IN ('pending', 'completed', 'deferred')) DEFAULT 'pending';

-- Update RLS policy for morning_tasks to include new columns if specific update permissions are desired.
-- For now, assuming the existing "Allow all" or user-specific policies cover new columns.
-- Example for user-specific: 
-- ALTER POLICY "Users can manage own tasks" ON morning_tasks
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND completed IS NOT NULL AND systemize_follow_up_completed IS NOT NULL ...);
