-- Insight history: save all generated insights for users to revisit
CREATE TABLE IF NOT EXISTS insight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_insight_history_user_type ON insight_history(user_id, insight_type, period_start DESC);

ALTER TABLE insight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insight history" ON insight_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insight history" ON insight_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
