-- Track rows created by dev test simulation for safe cleanup (localhost / development tooling)

ALTER TABLE public.morning_tasks
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.evening_reviews
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.morning_plan_commits
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user';

COMMENT ON COLUMN public.morning_tasks.source IS 'user | test_simulation — dev simulation cleanup';
COMMENT ON COLUMN public.evening_reviews.source IS 'user | test_simulation — dev simulation cleanup';
COMMENT ON COLUMN public.morning_plan_commits.source IS 'user | test_simulation — dev simulation cleanup';
