-- Task templates: reusable morning task sets per user

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  why_important TEXT,
  is_proactive BOOLEAN DEFAULT false,
  is_needle_mover BOOLEAN DEFAULT false,
  action_plan TEXT,
  task_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- Only allow users to manage their own templates and tasks

CREATE POLICY "Users can manage their own task_templates"
  ON task_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view template_tasks via own templates"
  ON template_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage template_tasks via own templates"
  ON template_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM task_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  );

