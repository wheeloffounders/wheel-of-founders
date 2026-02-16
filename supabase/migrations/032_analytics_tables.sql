-- Cross-user analytics for founder dashboard
-- 1. Extracted patterns from user reflections
CREATE TABLE IF NOT EXISTS user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  pattern_type TEXT NOT NULL,
  pattern_text TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source_table TEXT,
  source_id UUID,
  detected_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- 2. Feature usage metrics
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feature_name TEXT NOT NULL,
  action TEXT NOT NULL,
  page TEXT,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. User cohorts for retention analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
  cohort_date DATE PRIMARY KEY,
  user_count INTEGER,
  day_1_retention INTEGER,
  day_7_retention INTEGER,
  day_30_retention INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Aggregated daily stats for founder dashboard
CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  active_users INTEGER,
  new_users INTEGER,
  morning_plan_rate FLOAT,
  evening_review_rate FLOAT,
  needle_mover_usage_rate FLOAT,
  avg_tasks_completed FLOAT,
  avg_focus_score FLOAT,
  top_struggles JSONB,
  top_wins JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Pattern extraction queue (batch processing)
CREATE TABLE IF NOT EXISTS pattern_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  source_table TEXT,
  source_id UUID,
  content TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_patterns_user ON user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_type ON user_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_user_patterns_detected ON user_patterns(detected_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created ON feature_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_pattern_queue_unprocessed ON pattern_extraction_queue(processed, created_at);

-- RLS: service role only for analytics tables
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_extraction_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to user_patterns" ON user_patterns;
CREATE POLICY "Service role full access to user_patterns"
  ON user_patterns FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access to feature_usage" ON feature_usage;
CREATE POLICY "Service role full access to feature_usage"
  ON feature_usage FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access to daily_stats" ON daily_stats;
CREATE POLICY "Service role full access to daily_stats"
  ON daily_stats FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access to user_cohorts" ON user_cohorts;
CREATE POLICY "Service role full access to user_cohorts"
  ON user_cohorts FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access to pattern_extraction_queue" ON pattern_extraction_queue;
CREATE POLICY "Service role full access to pattern_extraction_queue"
  ON pattern_extraction_queue FOR ALL TO service_role USING (true);
