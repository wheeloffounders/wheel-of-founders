-- Wheel of Founders: Add completed column to morning_tasks
-- Run this in Supabase SQL Editor

ALTER TABLE morning_tasks
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Update RLS policy to allow users to update their own tasks' completed status
-- (Assuming basic RLS is already in place, if not, adjust as needed)
CREATE POLICY "Allow user to update own task completed status" ON morning_tasks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND completed IS NOT NULL);

-- NOTE: The above RLS policy is a placeholder. 
-- If you have a general "Allow all" policy for development, it will override this.
-- When implementing user authentication, you'll want to refine your RLS policies.
