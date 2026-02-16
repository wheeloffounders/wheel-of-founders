-- Function to refresh cohort_retention materialized view
-- Called by cron /api/cron/refresh-cohort
-- CONCURRENTLY allows reads during refresh (requires UNIQUE INDEX on cohort_retention, which 035 adds)

CREATE OR REPLACE FUNCTION refresh_cohort_retention()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY cohort_retention;
$$;
