ALTER TABLE public.morning_plan_commits
ADD COLUMN IF NOT EXISTS original_task_count INTEGER DEFAULT 0;

UPDATE public.morning_plan_commits mpc
SET original_task_count = src.cnt
FROM (
  SELECT user_id, plan_date, COUNT(*)::INTEGER AS cnt
  FROM public.morning_tasks
  WHERE trim(COALESCE(description, '')) <> ''
  GROUP BY user_id, plan_date
) src
WHERE mpc.user_id = src.user_id
  AND mpc.plan_date = src.plan_date
  AND (mpc.original_task_count IS NULL OR mpc.original_task_count = 0);

