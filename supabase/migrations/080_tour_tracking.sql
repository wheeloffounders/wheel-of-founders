-- Tour pop-up tracking for first-time users
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tour_dismissed_at TIMESTAMPTZ;
