-- Track when user last viewed weekly/monthly/quarterly insights for notification badges
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_viewed_weekly TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_viewed_monthly TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_viewed_quarterly TIMESTAMP WITH TIME ZONE;
