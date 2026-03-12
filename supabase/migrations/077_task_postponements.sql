-- Task postponements: track when tasks are moved to a later date

CREATE TABLE IF NOT EXISTS task_postponements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES morning_tasks(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  action_plan TEXT,
  original_date DATE NOT NULL,
  moved_to_date DATE NOT NULL,
  moved_at TIMESTAMPTZ DEFAULT now(),
  is_needle_mover BOOLEAN DEFAULT false,
  is_proactive BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_task_postponements_user ON task_postponements(user_id);
CREATE INDEX IF NOT EXISTS idx_task_postponements_task ON task_postponements(task_id);

ALTER TABLE task_postponements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own task_postponements"
  ON task_postponements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add postponement summary columns to morning_tasks
ALTER TABLE morning_tasks 
ADD COLUMN IF NOT EXISTS postpone_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_planned_date DATE,
ADD COLUMN IF NOT EXISTS last_postponed_at TIMESTAMPTZ;

