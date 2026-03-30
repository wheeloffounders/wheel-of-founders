-- Decision Style feature unlock (after 5 morning decisions)

-- 1) Trigger function
CREATE OR REPLACE FUNCTION unlock_decision_style_feature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Unlock only once, and only after the 5-decision threshold is reached.
  IF (
    SELECT COUNT(*)
    FROM public.morning_decisions
    WHERE user_id = NEW.user_id
  ) >= 5
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_unlocks
    WHERE user_id = NEW.user_id
      AND unlock_type = 'feature'
      AND unlock_name = 'decision_style'
  ) THEN
    INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
    VALUES (NEW.user_id, 'feature', 'decision_style', now());

    UPDATE public.user_profiles
    SET unlocked_features =
      COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
        'name', 'decision_style',
        'label', 'Decision Style',
        'description', 'Understand whether your decisions lean strategic or tactical',
        'icon', '🎯',
        'unlocked_at', now()
      )
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Attach trigger to morning_decisions
DROP TRIGGER IF EXISTS trg_unlock_decision_style ON public.morning_decisions;

CREATE TRIGGER trg_unlock_decision_style
AFTER INSERT ON public.morning_decisions
FOR EACH ROW
EXECUTE FUNCTION unlock_decision_style_feature();

-- 3) RLS policy for feature insert
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert decision_style feature" ON public.user_unlocks;

CREATE POLICY "Users can insert decision_style feature"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'feature'
    AND unlock_name = 'decision_style'
  );

-- 4) Backfill for existing users with >= 5 decisions
INSERT INTO public.user_unlocks (user_id, unlock_type, unlock_name, unlocked_at)
SELECT
  md.user_id,
  'feature'::text,
  'decision_style'::text,
  now()
FROM public.morning_decisions md
GROUP BY md.user_id
HAVING COUNT(*) >= 5
ON CONFLICT (user_id, unlock_type, unlock_name) DO NOTHING;

UPDATE public.user_profiles
SET unlocked_features =
  COALESCE(unlocked_features, '[]'::jsonb) || jsonb_build_object(
    'name', 'decision_style',
    'label', 'Decision Style',
    'description', 'Understand whether your decisions lean strategic or tactical',
    'icon', '🎯',
    'unlocked_at', now()
  )
WHERE id IN (
  SELECT md.user_id
  FROM public.morning_decisions md
  GROUP BY md.user_id
  HAVING COUNT(*) >= 5
)
AND NOT (
  COALESCE(unlocked_features, '[]'::jsonb) @> '[{"name":"decision_style"}]'::jsonb
);

