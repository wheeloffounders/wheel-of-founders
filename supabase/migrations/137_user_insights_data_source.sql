-- Older deployments may have user_insights without data_source (table pre-dates 012 or partial apply).

ALTER TABLE public.user_insights
  ADD COLUMN IF NOT EXISTS data_source TEXT[];

COMMENT ON COLUMN public.user_insights.data_source IS 'Which sources contributed: morning_tasks, evening_reviews, emergencies, etc.';
