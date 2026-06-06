-- Founder Radar: blog/home landings without widget interaction (page_view).

ALTER TABLE public.funnel_analytics
  DROP CONSTRAINT IF EXISTS funnel_analytics_event_type_check;

ALTER TABLE public.funnel_analytics
  ADD CONSTRAINT funnel_analytics_event_type_check
  CHECK (event_type IN ('page_view', 'start', 'complete', 'conversion'));

ALTER TABLE public.funnel_analytics
  ADD COLUMN IF NOT EXISTS page_path text;

COMMENT ON COLUMN public.funnel_analytics.page_path IS
  'For page_view: canonical path e.g. /blog/stop-mission-drift. Null for start/complete/conversion.';

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_page_view_created
  ON public.funnel_analytics (page_path, created_at DESC)
  WHERE event_type = 'page_view';
