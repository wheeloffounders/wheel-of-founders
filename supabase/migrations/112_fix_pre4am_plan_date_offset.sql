-- Fix misdated morning_tasks created during local 00:00-03:59 window.
-- Safe/targeted rules:
-- 1) Only recent rows (last 60 days) are considered.
-- 2) Only rows where plan_date equals local calendar date before 4am are shifted back by 1 day.
-- 3) Also fixes rare over-shifted rows where plan_date is 2 days behind local date before 4am.
-- 4) Does NOT rewrite all user history to one date.

WITH task_local AS (
  SELECT
    mt.id,
    mt.plan_date,
    COALESCE(up.timezone, 'UTC') AS tz,
    (mt.created_at AT TIME ZONE COALESCE(up.timezone, 'UTC'))::date AS local_date,
    EXTRACT(HOUR FROM (mt.created_at AT TIME ZONE COALESCE(up.timezone, 'UTC')))::int AS local_hour
  FROM public.morning_tasks mt
  JOIN public.user_profiles up
    ON up.id = mt.user_id
  WHERE mt.created_at >= NOW() - INTERVAL '60 days'
),
to_fix_one_day AS (
  SELECT
    id,
    (local_date - INTERVAL '1 day')::date AS corrected_date
  FROM task_local
  WHERE local_hour < 4
    AND plan_date = local_date
),
to_fix_two_days AS (
  SELECT
    id,
    (local_date - INTERVAL '1 day')::date AS corrected_date
  FROM task_local
  WHERE local_hour < 4
    AND plan_date = (local_date - INTERVAL '2 day')::date
),
all_fixes AS (
  SELECT * FROM to_fix_one_day
  UNION ALL
  SELECT * FROM to_fix_two_days
)
UPDATE public.morning_tasks mt
SET
  plan_date = af.corrected_date,
  updated_at = NOW()
FROM all_fixes af
WHERE mt.id = af.id;

-- Optional: inspect how many rows still look suspicious after fix.
-- SELECT COUNT(*) AS suspicious_rows
-- FROM public.morning_tasks mt
-- JOIN public.user_profiles up ON up.id = mt.user_id
-- WHERE mt.created_at >= NOW() - INTERVAL '60 days'
--   AND EXTRACT(HOUR FROM (mt.created_at AT TIME ZONE COALESCE(up.timezone, 'UTC')))::int < 4
--   AND mt.plan_date = (mt.created_at AT TIME ZONE COALESCE(up.timezone, 'UTC'))::date;
