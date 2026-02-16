-- 1. FUNNELS: "Users who do X then Y"
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  funnel_name TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_number INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel ON funnel_events(funnel_name);
CREATE INDEX IF NOT EXISTS idx_funnel_events_completed ON funnel_events(completed_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id);

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to funnel_events" ON funnel_events;
CREATE POLICY "Service role full access to funnel_events"
  ON funnel_events FOR ALL TO service_role USING (true);

-- 2. USER JOURNEYS: page_views + user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  page_sequence TEXT[],
  duration_seconds INTEGER,
  completed_flow BOOLEAN
);

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES user_sessions(id),
  path TEXT NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_entered ON page_views(entered_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to user_sessions" ON user_sessions;
CREATE POLICY "Service role full access to user_sessions"
  ON user_sessions FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "Service role full access to page_views" ON page_views;
CREATE POLICY "Service role full access to page_views"
  ON page_views FOR ALL TO service_role USING (true);

-- 3. A/B TESTING
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  variants JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  experiment_id UUID REFERENCES experiments(id) NOT NULL,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  experiment_id UUID REFERENCES experiments(id),
  variant TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_type ON experiment_events(event_type);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to experiments" ON experiments;
CREATE POLICY "Service role full access to experiments"
  ON experiments FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "Service role full access to experiment_assignments" ON experiment_assignments;
CREATE POLICY "Service role full access to experiment_assignments"
  ON experiment_assignments FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "Service role full access to experiment_events" ON experiment_events;
CREATE POLICY "Service role full access to experiment_events"
  ON experiment_events FOR ALL TO service_role USING (true);
