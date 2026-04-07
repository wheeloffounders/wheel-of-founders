-- One-off repair: insert a completed March 2026 monthly insight for a specific user.
-- Run in Supabase SQL editor after replacing email if needed.
-- Table uses `email_address` on user_profiles and status `completed` (not `generated`).

INSERT INTO public.monthly_insights (
  user_id,
  month_start,
  month_end,
  insight_text,
  status,
  generated_at,
  retry_count,
  next_retry_at
)
SELECT
  id,
  '2026-03-01'::date,
  '2026-03-31'::date,
  'Your March insight is ready. (If you see this note after an AI outage, open Monthly Insight and tap generate for a full personalized reflection.)',
  'completed',
  NOW(),
  0,
  NULL
FROM public.user_profiles
WHERE email_address = 'sniclam@gmail.com'
ON CONFLICT (user_id, month_start) DO NOTHING;
