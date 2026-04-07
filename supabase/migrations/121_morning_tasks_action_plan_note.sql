-- Optional note for action-plan guidance (single column; persists when user switches plans)
ALTER TABLE morning_tasks
ADD COLUMN IF NOT EXISTS action_plan_note TEXT;
