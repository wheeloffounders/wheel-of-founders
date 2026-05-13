/* Founder Radar: first-touch inbound context (UTM + referrer + landing path). */

ALTER TABLE public.funnel_analytics
  ADD COLUMN IF NOT EXISTS inbound_snapshot jsonb;

COMMENT ON COLUMN public.funnel_analytics.inbound_snapshot IS
  'Optional first-touch marketing snapshot (referrer, utms, landing path, touch_label) on start/conversion events.';

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_conversion_created
  ON public.funnel_analytics (created_at DESC)
  WHERE event_type = 'conversion';
