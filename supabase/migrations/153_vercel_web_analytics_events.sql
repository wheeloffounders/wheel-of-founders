-- Ingested from Vercel Web Analytics Drains (vercel.analytics.v2).
-- Enables admin Acquisition hub to show referrer, geo, and device data Vercel captures.

CREATE TABLE IF NOT EXISTS public.vercel_web_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_name TEXT,
  path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  query_params TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,
  client_name TEXT,
  os_name TEXT,
  session_id BIGINT,
  device_id BIGINT,
  origin TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vercel_wa_recorded_at
  ON public.vercel_web_analytics_events (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vercel_wa_path_recorded
  ON public.vercel_web_analytics_events (path, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vercel_wa_event_type_recorded
  ON public.vercel_web_analytics_events (event_type, recorded_at DESC);

COMMENT ON TABLE public.vercel_web_analytics_events IS
  'Page views and custom events forwarded by Vercel Web Analytics Drains.';

ALTER TABLE public.vercel_web_analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vercel_web_analytics_events FROM PUBLIC;
GRANT SELECT, INSERT ON public.vercel_web_analytics_events TO service_role;
