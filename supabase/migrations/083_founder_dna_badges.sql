-- Wheel of Founders: Founder DNA badges (Day 1 - First Spark)

-- A) Add columns to user_profiles (if missing)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unlocked_features JSONB DEFAULT '[]'::jsonb;

-- B) Create user_unlocks table
CREATE TABLE IF NOT EXISTS user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL, -- 'badge' | 'feature'
  unlock_name TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  seen_notification BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, unlock_type, unlock_name)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS user_unlocks_user_id_idx ON user_unlocks (user_id);
CREATE INDEX IF NOT EXISTS user_unlocks_type_name_idx ON user_unlocks (unlock_type, unlock_name);

-- C) Create trigger function to unlock "first_spark"
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

-- Attach trigger to morning_tasks
DROP TRIGGER IF EXISTS trg_unlock_first_spark ON morning_tasks;

CREATE TRIGGER trg_unlock_first_spark
AFTER UPDATE ON morning_tasks
FOR EACH ROW
EXECUTE FUNCTION unlock_first_spark_badge();

-- D) RLS Policies for user_unlocks
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocks"
  ON user_unlocks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert first_spark badge"
  ON user_unlocks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND unlock_type = 'badge'
    AND unlock_name = 'first_spark'
  );

