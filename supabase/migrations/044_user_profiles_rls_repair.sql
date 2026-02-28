-- Repair RLS policies for user_profiles
-- Fixes: "RLS policy doesn't allow updates" when saving timezone/preferences
-- Run this in Supabase SQL Editor if updates are blocked

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the main policy (covers SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
CREATE POLICY "Users can manage own profile"
ON user_profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
