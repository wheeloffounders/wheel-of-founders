-- Indexes for scheduled insight generation cron jobs
-- Speeds up queries for active users and prompt lookups

-- Partial index for active users (last_review_date in last N days)
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active 
ON user_profiles(last_review_date) 
WHERE last_review_date IS NOT NULL;
