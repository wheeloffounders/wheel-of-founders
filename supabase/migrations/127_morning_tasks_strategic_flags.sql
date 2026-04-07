-- Pro: mark user-refined tasks for strategic memory; tag recurring blueprint rows for audit.

ALTER TABLE public.morning_tasks
  ADD COLUMN IF NOT EXISTS user_refined boolean NOT NULL DEFAULT false;

ALTER TABLE public.morning_tasks
  ADD COLUMN IF NOT EXISTS recurring_blueprint_key text NULL;

COMMENT ON COLUMN public.morning_tasks.user_refined IS
  'True after the founder saved Refine (How/Why) for this task — high-signal for ghostwriter memory.';

COMMENT ON COLUMN public.morning_tasks.recurring_blueprint_key IS
  'Optional preset or freq blueprint id (e.g. preset:weekly_marketing, freq:...) for post-morning rhythm copy.';

CREATE INDEX IF NOT EXISTS idx_morning_tasks_user_refined_plan
  ON public.morning_tasks (user_id, plan_date)
  WHERE user_refined = true;
