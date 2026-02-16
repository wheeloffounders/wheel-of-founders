-- Planning mode: full (3 tasks) vs light (2 tasks) for users who over-plan
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS planning_mode TEXT DEFAULT 'full' CHECK (planning_mode IN ('full', 'light'));
