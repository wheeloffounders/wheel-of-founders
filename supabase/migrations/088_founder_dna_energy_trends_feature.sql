-- Energy & Mood Trend feature unlock (after 3 evening reviews)

-- 1) Trigger function
CREATE OR REPLACE FUNCTION unlock_energy_trends_feature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only unlock once and only after reaching the 3-review threshold.
  IF (
    SELECT COUNT(*)
    FROM public.evening_reviews
    WHERE user_id = NEW.user_id
  ) >= 3
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_unlocks
    WHERE user_id = NEW.user_id
      AND unlock_type = 'feature'
      AND unlock_name = 'energy_trends'
  ) THEN
    INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
    VALUES (NEW.user_id, 'feature', 'energy_trends', now());

    UPDATE public.user_profiles
    SET unlocked_features =
      COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
        'name', 'energy_trends',
        'label', 'Energy & Mood Trend',
        'description', 'Track how your energy and mood shift over time',
        'icon', '📊',
        'unlocked_at', now()
      )
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Attach trigger
DROP TRIGGER IF EXISTS trg_unlock_energy_trends ON public.evening_reviews;

CREATE TRIGGER trg_unlock_energy_trends
AFTER INSERT ON public.evening_reviews
FOR EACH ROW
EXECUTE FUNCTION unlock_energy_trends_feature();

-- 3) RLS policy for feature insert
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert energy_trends feature" ON public.user_unlocks;

CREATE POLICY "Users can insert energy_trends feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'energy_trends'
  );

-- 4) Backfill for existing users with >= 3 evening reviews
INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT
  er.user_id,
  'feature'::text,
  'energy_trends'::text,
  now()
FROM public.evening_reviews er
GROUP BY er.user_id
HAVING COUNT(*) >= 3
ON CONFLICT (user_id, unlock_type, unlock_name) DO NOTHING;

UPDATE public.user_profiles
SET unlocked_features =
  COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
    'name', 'energy_trends',
    'label', 'Energy & Mood Trend',
    'description', 'Track how your energy and mood shift over time',
    'icon', '📊',
    'unlocked_at', now()
  )
WHERE id IN (
  SELECT er.user_id
  FROM public.evening_reviews er
  GROUP BY er.user_id
  HAVING COUNT(*) >= 3
)
AND NOT (
  COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"energy_trends"}]'::jsonb
);

