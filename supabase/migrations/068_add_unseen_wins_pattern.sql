-- Weekly insights table: one row per user per week (Monday start).
-- Stores full weekly insight and Unseen Wins pattern for dashboard + weekly page.
CREATE TABLE IF NOT EXISTS weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  insight_text TEXT,
  unseen_wins_pattern TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_insights_user_week ON weekly_insights(user_id, week_start);

ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly insights"
  ON weekly_insights FOR SELECT USING (auth.uid() = user_id);
