-- Diagnose dropped users: check if page_views and funnel_events have data
-- Run in Supabase SQL Editor

-- 1. Page views for /morning (last 90 days)
SELECT
  pv.user_id,
  u.email,
  pv.path,
  pv.entered_at,
  pv.exited_at,
  pv.duration_seconds
FROM page_views pv
JOIN auth.users u ON u.id = pv.user_id
WHERE pv.path = '/morning'
  AND pv.entered_at >= NOW() - INTERVAL '90 days'
ORDER BY pv.entered_at DESC
LIMIT 20;

-- 2. Funnel events (morning_flow) - last 90 days
SELECT
  fe.user_id,
  u.email,
  fe.funnel_name,
  fe.step_name,
  fe.completed_at
FROM funnel_events fe
JOIN auth.users u ON u.id = fe.user_id
WHERE fe.funnel_name = 'morning_flow'
  AND fe.completed_at >= NOW() - INTERVAL '90 days'
ORDER BY fe.completed_at DESC
LIMIT 20;

-- 3. Feature usage (user_journey) - viewed_morning, typed_first_task
SELECT
  fu.user_id,
  u.email,
  fu.action,
  fu.created_at
FROM feature_usage fu
JOIN auth.users u ON u.id = fu.user_id
WHERE fu.feature_name = 'user_journey'
  AND fu.action IN ('viewed_morning', 'typed_first_task', 'saved_morning')
  AND fu.created_at >= NOW() - INTERVAL '90 days'
ORDER BY fu.created_at DESC
LIMIT 30;
