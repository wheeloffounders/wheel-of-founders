-- Wheel of Founders: Morning Plan Tables
-- Run this in Supabase SQL Editor

-- Morning tasks (Power List - max 3 per day)
CREATE TABLE IF NOT EXISTS morning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  task_order SMALLINT NOT NULL CHECK (task_order >= 1 AND task_order <= 3),
  description TEXT NOT NULL DEFAULT '',
  why_this_matters TEXT DEFAULT '',
  needle_mover BOOLEAN DEFAULT false,
  preventability TEXT CHECK (preventability IN ('batch', 'delegate', 'eliminate', 'do_now')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Morning decisions (Decision Log)
CREATE TABLE IF NOT EXISTS morning_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  decision TEXT NOT NULL DEFAULT '',
  decision_type TEXT NOT NULL CHECK (decision_type IN ('strategic', 'tactical')),
  why_this_decision TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_morning_tasks_plan_date ON morning_tasks(plan_date);
CREATE INDEX IF NOT EXISTS idx_morning_tasks_user_date ON morning_tasks(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_morning_decisions_plan_date ON morning_decisions(plan_date);
CREATE INDEX IF NOT EXISTS idx_morning_decisions_user_date ON morning_decisions(user_id, plan_date);

-- Enable Row Level Security (RLS)
ALTER TABLE morning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE morning_decisions ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for anon/authenticated (you can tighten when auth is ready)
-- For development without auth, these policies allow public access via anon key
CREATE POLICY "Allow all for morning_tasks" ON morning_tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for morning_decisions" ON morning_decisions
  FOR ALL USING (true) WITH CHECK (true);

-- Optional: If using auth later, replace above with user-scoped policies:
-- CREATE POLICY "Users can manage own tasks" ON morning_tasks
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can manage own decisions" ON morning_decisions
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
