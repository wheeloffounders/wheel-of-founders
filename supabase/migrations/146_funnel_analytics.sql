/* Founder Radar: funnel_analytics (start, complete, conversion). */

CREATE TABLE IF NOT EXISTS public.funnel_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  funnel_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('start', 'complete', 'conversion')),
  visitor_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('home', 'blog'))
);

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_funnel_created
  ON public.funnel_analytics (funnel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_visitor_created
  ON public.funnel_analytics (visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_event_created
  ON public.funnel_analytics (event_type, created_at DESC);

COMMENT ON TABLE public.funnel_analytics IS 'Blog and home funnel telemetry, service_role API writes only.';

ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;

/* RLS on with no policies: block anon and authenticated. service_role bypasses RLS. */

REVOKE ALL ON public.funnel_analytics FROM PUBLIC;
GRANT SELECT, INSERT ON public.funnel_analytics TO service_role;
