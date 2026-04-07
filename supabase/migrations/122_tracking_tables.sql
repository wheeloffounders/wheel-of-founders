-- Calendar subscription tracking, feed sync logs, session arrival sources, user_sessions.session_source

-- 1) Calendar: subscription rows (token is unique; history when user regenerates)
CREATE TABLE IF NOT EXISTS public.calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_token TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_subscriptions_token_unique
  ON public.calendar_subscriptions(subscription_token);

CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_user_active
  ON public.calendar_subscriptions(user_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_created
  ON public.calendar_subscriptions(created_at DESC);

-- 2) Each calendar client fetch (ICS / HEAD)
CREATE TABLE IF NOT EXISTS public.calendar_feed_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_token TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_calendar_feed_requests_requested
  ON public.calendar_feed_requests(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_feed_requests_user_requested
  ON public.calendar_feed_requests(user_id, requested_at DESC);

-- 3) Parsed arrival attribution (UTM / product links)
CREATE TABLE IF NOT EXISTS public.session_source_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('direct', 'calendar', 'email', 'push')),
  landing_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_source_events_created
  ON public.session_source_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_source_events_source_created
  ON public.session_source_events(source, created_at DESC);

-- 4) user_sessions: optional column for future session rows
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS session_source TEXT;

-- RLS (service role bypasses; lock down anon/auth)
ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_feed_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_source_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access calendar_subscriptions" ON public.calendar_subscriptions;
CREATE POLICY "Service role full access calendar_subscriptions"
  ON public.calendar_subscriptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access calendar_feed_requests" ON public.calendar_feed_requests;
CREATE POLICY "Service role full access calendar_feed_requests"
  ON public.calendar_feed_requests FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access session_source_events" ON public.session_source_events;
CREATE POLICY "Service role full access session_source_events"
  ON public.session_source_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 5) Day-based retention snapshot (signup cohort: 31–120 days ago, activity = morning or evening any day)
CREATE OR REPLACE FUNCTION public.admin_tracking_day_retention()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT
      id AS user_id,
      (created_at AT TIME ZONE 'UTC')::date AS signup_day
    FROM user_profiles
    WHERE created_at IS NOT NULL
      AND created_at <= NOW() - INTERVAL '31 days'
      AND created_at >= NOW() - INTERVAL '120 days'
  ),
  activity_days AS (
    SELECT user_id, plan_date::date AS d FROM morning_tasks
    UNION
    SELECT user_id, review_date::date AS d FROM evening_reviews
  ),
  marked AS (
    SELECT
      c.user_id,
      EXISTS (
        SELECT 1 FROM activity_days a
        WHERE a.user_id = c.user_id AND a.d = c.signup_day + 1
      ) AS hit_d1,
      EXISTS (
        SELECT 1 FROM activity_days a
        WHERE a.user_id = c.user_id AND a.d BETWEEN c.signup_day + 1 AND c.signup_day + 3
      ) AS hit_d3,
      EXISTS (
        SELECT 1 FROM activity_days a
        WHERE a.user_id = c.user_id AND a.d BETWEEN c.signup_day + 1 AND c.signup_day + 7
      ) AS hit_d7,
      EXISTS (
        SELECT 1 FROM activity_days a
        WHERE a.user_id = c.user_id AND a.d BETWEEN c.signup_day + 1 AND c.signup_day + 30
      ) AS hit_d30
    FROM cohort c
  ),
  agg AS (
    SELECT
      COUNT(*)::numeric AS n,
      COUNT(*) FILTER (WHERE hit_d1)::numeric AS d1_n,
      COUNT(*) FILTER (WHERE hit_d3)::numeric AS d3_n,
      COUNT(*) FILTER (WHERE hit_d7)::numeric AS d7_n,
      COUNT(*) FILTER (WHERE hit_d30)::numeric AS d30_n
    FROM marked
  )
  SELECT jsonb_build_object(
    'cohort_users', agg.n::int,
    'd1_pct', CASE WHEN agg.n > 0 THEN ROUND(100 * agg.d1_n / agg.n, 1) ELSE 0 END,
    'd3_pct', CASE WHEN agg.n > 0 THEN ROUND(100 * agg.d3_n / agg.n, 1) ELSE 0 END,
    'd7_pct', CASE WHEN agg.n > 0 THEN ROUND(100 * agg.d7_n / agg.n, 1) ELSE 0 END,
    'd30_pct', CASE WHEN agg.n > 0 THEN ROUND(100 * agg.d30_n / agg.n, 1) ELSE 0 END
  )
  FROM agg;
$$;

REVOKE ALL ON FUNCTION public.admin_tracking_day_retention() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_tracking_day_retention() TO service_role;
