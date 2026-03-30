-- First Glimpse: RLS for user_unlocks + backfill for users with ≥1 evening review.
-- App caches copy in user_profiles.last_refreshed.first_glimpse (see LAST_REFRESH_KEYS.firstGlimpse).

DROP POLICY IF EXISTS "Users can insert first_glimpse feature" ON public.user_unlocks;
CREATE POLICY "Users can insert first_glimpse feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'first_glimpse'
  );

INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT sub.user_id, 'feature', 'first_glimpse', now()
FROM (
  SELECT DISTINCT user_id
  FROM public.evening_reviews
) sub
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_unlocks uu
  WHERE uu.user_id = sub.user_id
    AND uu.unlock_type = 'feature'
    AND uu.unlock_name = 'first_glimpse'
);

-- Append first_glimpse to unlocked_features JSON when missing (best-effort)
UPDATE public.user_profiles up
SET unlocked_features = COALESCE(up.unlocked_features, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'name', 'first_glimpse',
    'label', 'First Glimpse',
    'description', 'Mrs. Deer''s first mirror after your opening evening — Rhythm, Tuesday refresh',
    'icon', '🔓',
    'unlocked_at', to_jsonb(now()::text)
  )
)
WHERE EXISTS (SELECT 1 FROM public.evening_reviews er WHERE er.user_id = up.id)
  AND NOT (COALESCE(up.unlocked_features, '[]'::jsonb) @> '[{"name":"first_glimpse"}]'::jsonb);
