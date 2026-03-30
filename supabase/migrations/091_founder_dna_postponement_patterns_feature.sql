-- Postponement Patterns feature unlock (after 7 postponed tasks)

-- Trigger unlocks once when a user reaches 7+ total postponements.
CREATE OR REPLACE FUNCTION unlock_postponement_patterns_feature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.task_postponements WHERE user_id = NEW.user_id
  ) >= 7
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

-- Attach trigger
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

-- Backfill existing users with >=7 postponements
INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT
  tp.user_id,
  'feature'::text,
  'postponement_patterns'::text,
  now()
FROM public.task_postponements tp
GROUP BY tp.user_id
HAVING COUNT(*) >= 7
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
WHERE id IN (
  SELECT user_id
  FROM public.task_postponements
  GROUP BY user_id
  HAVING COUNT(*) >= 7
)
AND NOT (
  COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"postponement_patterns"}]'::jsonb
);

