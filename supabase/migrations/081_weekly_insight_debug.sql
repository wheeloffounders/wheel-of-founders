CREATE TABLE weekly_insight_debug (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  attempt_number INT DEFAULT 1,
  stage TEXT CHECK (stage IN ('init', 'data_fetch', 'ai_call', 'save', 'complete', 'failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_weekly_insight_debug_user_week ON weekly_insight_debug(user_id, week_start);
CREATE INDEX idx_weekly_insight_debug_stage ON weekly_insight_debug(stage);
CREATE INDEX idx_weekly_insight_debug_attempts ON weekly_insight_debug(attempt_number);

ALTER TABLE weekly_insight_debug ENABLE ROW LEVEL SECURITY;

-- Only service role can access (via service_role JWT)
CREATE POLICY "Service role can manage weekly_insight_debug" ON weekly_insight_debug
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

