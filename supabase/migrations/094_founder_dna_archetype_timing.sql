-- Progressive Founder Archetype: emerging preview at 21 days active, full profile at 30 days.
-- Preview/full are determined by API from account age; no extra columns.
--
-- Remove premature founder_archetype unlocks for accounts that have not reached 21 days yet
-- (previously unlocked at 7 days). Users 21+ keep access; mode (preview vs full) is computed in app.

DELETE FROM public.user_unlocks
WHERE unlock_type = 'feature'
  AND unlock_name = 'founder_archetype'
  AND user_id IN (
    SELECT up.id
    FROM public.user_profiles up
    WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 21
  );

UPDATE public.user_profiles
SET unlocked_features = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(unlocked_features, '[]'::jsonb)) AS value
  WHERE value->>'name' <> 'founder_archetype'
)
WHERE id IN (
  SELECT up.id
  FROM public.user_profiles up
  WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 21
    AND COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"founder_archetype"}]'::jsonb
);
