-- Align Celebration Gap + Recurring Question with day-based gates (day 13 / 18).
-- Removes unlock rows granted by 095 when the account is still younger than the threshold.

DELETE FROM public.user_unlocks
WHERE unlock_type = 'feature'
  AND unlock_name = 'celebration_gap'
  AND user_id IN (
    SELECT up.id FROM public.user_profiles up
    WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 13
  );

UPDATE public.user_profiles
SET unlocked_features = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(unlocked_features, '[]'::jsonb)) AS value
  WHERE value->>'name' <> 'celebration_gap'
)
WHERE id IN (
  SELECT up.id FROM public.user_profiles up
  WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 13
    AND COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"celebration_gap"}]'::jsonb
);

DELETE FROM public.user_unlocks
WHERE unlock_type = 'feature'
  AND unlock_name = 'recurring_question'
  AND user_id IN (
    SELECT up.id FROM public.user_profiles up
    WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 18
  );

UPDATE public.user_profiles
SET unlocked_features = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(unlocked_features, '[]'::jsonb)) AS value
  WHERE value->>'name' <> 'recurring_question'
)
WHERE id IN (
  SELECT up.id FROM public.user_profiles up
  WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 18
    AND COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"recurring_question"}]'::jsonb
);
