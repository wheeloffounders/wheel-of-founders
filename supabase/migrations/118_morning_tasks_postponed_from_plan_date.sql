-- Track "moved to tomorrow" while still showing the task on the original day (undo) until save or day rolls.

ALTER TABLE public.morning_tasks
ADD COLUMN IF NOT EXISTS postponed_from_plan_date DATE;

COMMENT ON COLUMN public.morning_tasks.postponed_from_plan_date IS
  'When set with plan_date = next calendar day, task is still listed on this date for undo until plan save or rollover.';

CREATE INDEX IF NOT EXISTS idx_morning_tasks_user_postponed_from
  ON public.morning_tasks (user_id, postponed_from_plan_date)
  WHERE postponed_from_plan_date IS NOT NULL;
