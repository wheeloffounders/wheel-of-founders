-- Admin analytics read paths: composite indexes for date-scoped cohort queries.
-- Does not delete or alter tracked data.

CREATE INDEX IF NOT EXISTS idx_page_views_entered_at_user_id
  ON public.page_views (entered_at DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_page_views_user_entered_at
  ON public.page_views (user_id, entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_usage_created_at_user_id
  ON public.feature_usage (created_at DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_action_created
  ON public.feature_usage (feature_name, action, created_at DESC);
