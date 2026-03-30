-- Wheel of Founders: Re-define unlock_first_spark_badge with public-qualified tables

-- Purpose:
-- The function uses SECURITY DEFINER + SET search_path = ''.
-- That means unqualified table names won't resolve reliably.
-- We fully-qualify references to avoid "relation user_unlocks does not exist".

CREATE OR REPLACE FUNCTION unlock_first_spark_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only when a task is toggled to completed
  IF (OLD.completed IS DISTINCT FROM NEW.completed AND NEW.completed = true) THEN
    -- Avoid duplicates (unique constraint + explicit guard)
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
          'label', 'First Spark',
          'description', 'Completed your first morning reflection',
          'icon', '✨',
          'unlocked_at', NOW()
        )
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

