-- Wheel of Founders: User Insights Table (2 AM Batch Analysis)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  insight_text TEXT NOT NULL,
  insight_type TEXT CHECK (insight_type IN ('productivity', 'pattern', 'suggestion', 'achievement')),
  data_source TEXT[], -- Which tables contributed: ['morning_tasks', 'evening_reviews', etc.]
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_insights_user_date ON user_insights(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_insights_user_type ON user_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_user_insights_expires ON user_insights(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON user_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage insights" ON user_insights
  FOR ALL USING (auth.role() = 'service_role');

-- Analysis logs table for debugging
CREATE TABLE IF NOT EXISTS analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  status TEXT CHECK (status IN ('success', 'error', 'skipped')) NOT NULL,
  error_message TEXT,
  insights_generated INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_logs_date ON analysis_logs(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_user ON analysis_logs(user_id, analysis_date DESC);

ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage logs" ON analysis_logs
  FOR ALL USING (auth.role() = 'service_role');
