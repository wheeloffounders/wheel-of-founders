-- Founder Archetype feature unlock (after 7 days active)
--
-- Unlock is handled by the app (journey API / archetype API), but we provide:
-- - Backfill for existing users (>= 7 days old)
-- - Insert RLS policy for inserting the feature unlock

-- Insert unlock records for users whose account age is >= 7 days
INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT
  up.id,
  'feature'::text,
  'founder_archetype'::text,
  now()
FROM public.user_profiles up
WHERE up.created_at <= (now() - interval '7 days')
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_unlocks uu
    WHERE uu.user_id = up.id
      AND uu.unlock_type = 'feature'
      AND uu.unlock_name = 'founder_archetype'
  );

-- Append JSON feature to user_profiles.unlocked_features for those users
UPDATE public.user_profiles
SET unlocked_features =
  COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
    'name', 'founder_archetype',
    'label', 'Founder Archetype',
    'description', 'Discover the pattern behind how you decide and act',
    'icon', '🏷️',
    'unlocked_at', now()
  )
WHERE created_at <= (now() - interval '7 days')
  AND NOT (
    COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"founder_archetype"}]'::jsonb
  );

-- RLS policy for inserting founder_archetype unlocks
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert founder_archetype feature" ON public.user_unlocks;

CREATE POLICY "Users can insert founder_archetype feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'founder_archetype'
  );

