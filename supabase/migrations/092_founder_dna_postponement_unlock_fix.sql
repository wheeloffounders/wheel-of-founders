-- Postponement Patterns unlock fix:
-- New unlock condition: 7 days active (account age >= 7 days)
-- Old behavior (091): unlock after 7 postponed tasks.

-- Re-define the trigger function to unlock based on account age.
CREATE OR REPLACE FUNCTION unlock_postponement_patterns_feature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  days_active INTEGER;
BEGIN
  SELECT FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int
  INTO days_active
  FROM public.user_profiles up
  WHERE up.id = NEW.user_id;

  IF days_active >= 7
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_unlocks
       WHERE user_id = NEW.user_id
         AND unlock_type = 'feature'
         AND unlock_name = 'postponement_patterns'
     ) THEN
    INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
    VALUES (NEW.user_id, 'feature', 'postponement_patterns', now());

    UPDATE public.user_profiles
    SET unlocked_features =
      COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
        'name', 'postponement_patterns',
        'label', 'Postponement Patterns',
        'description', 'Understand what you tend to delay — and why',
        'icon', '⏳',
        'unlocked_at', now()
      )
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (in case the original definition was based on old logic).
DROP TRIGGER IF EXISTS trg_unlock_postponement_patterns ON public.task_postponements;

CREATE TRIGGER trg_unlock_postponement_patterns
AFTER INSERT ON public.task_postponements
FOR EACH ROW
EXECUTE FUNCTION unlock_postponement_patterns_feature();

-- RLS policy for inserting postponement_patterns unlocks
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert postponement_patterns feature" ON public.user_unlocks;

CREATE POLICY "Users can insert postponement_patterns feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'postponement_patterns'
  );

-- Backfill unlock for users with daysActive >= 7
INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT
  up.id,
  'feature'::text,
  'postponement_patterns'::text,
  now()
FROM public.user_profiles up
WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int >= 7
ON CONFLICT (user_id, unlock_type, unlock_name) DO NOTHING;

UPDATE public.user_profiles
SET unlocked_features =
  COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
    'name', 'postponement_patterns',
    'label', 'Postponement Patterns',
    'description', 'Understand what you tend to delay — and why',
    'icon', '⏳',
    'unlocked_at', now()
  )
WHERE FLOOR(EXTRACT(EPOCH FROM (now() - created_at)) / 86400)::int >= 7
  AND NOT (COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"postponement_patterns"}]'::jsonb);

-- Remove unlock for users with daysActive < 7 (undo old unlocks granted by 091).
DELETE FROM public.user_unlocks
WHERE unlock_type = 'feature'
  AND unlock_name = 'postponement_patterns'
  AND user_id IN (
    SELECT up.id
    FROM public.user_profiles up
    WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 7
  );

UPDATE public.user_profiles
SET unlocked_features = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(unlocked_features, '[]'::jsonb)) AS value
  WHERE value->>'name' <> 'postponement_patterns'
)
WHERE id IN (
  SELECT up.id
  FROM public.user_profiles up
  WHERE FLOOR(EXTRACT(EPOCH FROM (now() - up.created_at)) / 86400)::int < 7
    AND COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"postponement_patterns"}]'::jsonb
);

