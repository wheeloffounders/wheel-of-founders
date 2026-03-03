-- Add column to track when profile reminder was sent
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.profile_reminder_sent_at IS 'When the "complete your profile" reminder email was sent; null = not sent yet';

-- Index for the cron job query (users with incomplete profile, no reminder, signed up 3+ days ago)
CREATE INDEX IF NOT EXISTS idx_user_profiles_reminder
ON user_profiles(profile_completed_at, profile_reminder_sent_at)
WHERE profile_completed_at IS NULL AND profile_reminder_sent_at IS NULL;
