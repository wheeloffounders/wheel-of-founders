-- Quarterly Trajectory: persisted 90-day intention + weekly north-star quote cap for AI coaching
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS quarterly_intention TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS north_star_last_quoted_iso_week TEXT;

COMMENT ON COLUMN user_profiles.quarterly_intention IS 'User quarterly (90-day) intention; AI uses from Day 45+';
COMMENT ON COLUMN user_profiles.north_star_last_quoted_iso_week IS 'ISO week key (YYYY-Www) when primary goal was last quoted verbatim in generated coaching';
