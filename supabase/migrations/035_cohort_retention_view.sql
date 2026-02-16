-- Cohort retention: week-over-week retention using user_profiles.created_at + activity from evening_reviews/morning_tasks
DROP MATERIALIZED VIEW IF EXISTS cohort_retention;

CREATE MATERIALIZED VIEW cohort_retention AS
WITH cohorts AS (
  SELECT
    id as user_id,
    DATE_TRUNC('week', created_at)::date as cohort_week
  FROM user_profiles
  WHERE created_at IS NOT NULL
),
activity AS (
  SELECT user_id, DATE_TRUNC('week', review_date)::date as activity_week
  FROM evening_reviews
  UNION
  SELECT user_id, DATE_TRUNC('week', plan_date)::date as activity_week
  FROM morning_tasks
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c.user_id)::int as cohort_size,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week THEN c.user_id END)::int as week_0,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' THEN c.user_id END)::int as week_1,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' THEN c.user_id END)::int as week_2,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '3 weeks' THEN c.user_id END)::int as week_3,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '4 weeks' THEN c.user_id END)::int as week_4
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort_week
ORDER BY c.cohort_week DESC;

CREATE UNIQUE INDEX ON cohort_retention (cohort_week);
