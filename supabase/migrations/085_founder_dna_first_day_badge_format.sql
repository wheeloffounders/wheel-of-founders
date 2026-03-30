-- Wheel of Founders: Consolidate first-day badge to "First Day Badge" (Day 1 - First Spark)

-- Update trigger function to use the final label/icon.
CREATE OR REPLACE FUNCTION unlock_first_spark_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_unlocks
    WHERE user_id = NEW.user_id
      AND unlock_type = 'badge'
      AND unlock_name = 'first_spark'
  ) THEN
    INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
    VALUES (NEW.user_id, 'badge', 'first_spark', now());

    UPDATE public.user_profiles
    SET badges =
      COALESCE(badges, '[]'::jsonb) || jsonb_build_object(
        'name', 'first_spark',
        'label', 'First Day Badge',
        'description', 'Completed your first morning reflection',
        'icon', '🌟',
        'unlocked_at', NOW()
      )
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Update existing badge JSON for already-unlocked users (safe NULL handling).
UPDATE public.user_profiles
SET badges =
  (
    SELECT jsonb_agg(
      CASE
        WHEN value->>'name' = 'first_spark' THEN
          jsonb_build_object(
            'name', 'first_spark',
            'label', 'First Day Badge',
            'description', 'Completed your first morning reflection',
            'icon', '🌟',
            'unlocked_at', value->>'unlocked_at'
          )
        ELSE value
      END
    )
    FROM jsonb_array_elements(COALESCE(badges, '[]'::jsonb)) AS value
  )
WHERE COALESCE(badges, '[]'::jsonb) @> '[{"name": "first_spark"}]'::jsonb;

