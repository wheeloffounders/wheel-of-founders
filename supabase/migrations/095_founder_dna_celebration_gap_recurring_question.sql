-- Celebration Gap + Recurring Question: RLS insert policies and backfill for users with 6+ evening reviews.

-- Insert policies (server uses service role; client inserts still guarded per feature name)
DROP POLICY IF EXISTS "Users can insert celebration_gap feature" ON public.user_unlocks;
CREATE POLICY "Users can insert celebration_gap feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'celebration_gap'
  );

DROP POLICY IF EXISTS "Users can insert recurring_question feature" ON public.user_unlocks;
CREATE POLICY "Users can insert recurring_question feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'recurring_question'
  );

-- Backfill unlock rows (6+ evening reviews)
INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT sub.user_id, 'feature', 'celebration_gap', now()
FROM (
  SELECT user_id
  FROM public.evening_reviews
  GROUP BY user_id
  HAVING COUNT(*) >= 6
) sub
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_unlocks uu
  WHERE uu.user_id = sub.user_id AND uu.unlock_type = 'feature' AND uu.unlock_name = 'celebration_gap'
);

INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT sub.user_id, 'feature', 'recurring_question', now()
FROM (
  SELECT user_id
  FROM public.evening_reviews
  GROUP BY user_id
  HAVING COUNT(*) >= 6
) sub
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_unlocks uu
  WHERE uu.user_id = sub.user_id AND uu.unlock_type = 'feature' AND uu.unlock_name = 'recurring_question'
);

-- Append JSON features on user_profiles (idempotent check via JSON containment)
UPDATE public.user_profiles up
SET unlocked_features =
  COALESCE(up.unlocked_features, '[]'::jsonb) || jsonb_build_object(
    'name', 'celebration_gap',
    'label', 'Celebration Gap',
    'description', 'What you celebrate in wins vs what you name in lessons',
    'icon', '🪞',
    'unlocked_at', now()
  )
WHERE up.id IN (SELECT user_id FROM public.evening_reviews GROUP BY user_id HAVING COUNT(*) >= 6)
  AND NOT (COALESCE(up.unlocked_features, '[]'::jsonb) @> '[{"name":"celebration_gap"}]'::jsonb);

UPDATE public.user_profiles up
SET unlocked_features =
  COALESCE(up.unlocked_features, '[]'::jsonb) || jsonb_build_object(
    'name', 'recurring_question',
    'label', 'Recurring Question',
    'description', 'Questions you ask yourself again and again in reflections',
    'icon', '💫',
    'unlocked_at', now()
  )
WHERE up.id IN (SELECT user_id FROM public.evening_reviews GROUP BY user_id HAVING COUNT(*) >= 6)
  AND NOT (COALESCE(up.unlocked_features, '[]'::jsonb) @> '[{"name":"recurring_question"}]'::jsonb);
