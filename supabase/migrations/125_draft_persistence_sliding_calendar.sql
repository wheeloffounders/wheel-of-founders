-- Cross-device draft persistence + enforce one evening review per user/day for upserts

-- Keep newest row per (user_id, review_date) so the unique index can be created
DELETE FROM public.evening_reviews er
WHERE er.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, review_date
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.evening_reviews
  ) d WHERE d.rn > 1
);

ALTER TABLE public.evening_reviews
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.evening_reviews.is_draft IS 'True until user completes evening save; excluded from streaks and month dots.';

-- Cross-device in-progress morning plan without touching morning_tasks IDs (move/undo rely on stable task rows)
CREATE TABLE IF NOT EXISTS public.morning_plan_autosave (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  tasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_morning_plan_autosave_updated
  ON public.morning_plan_autosave (user_id, updated_at DESC);

ALTER TABLE public.morning_plan_autosave ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own morning_plan_autosave" ON public.morning_plan_autosave;
CREATE POLICY "Users manage own morning_plan_autosave"
  ON public.morning_plan_autosave
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.morning_plan_autosave IS 'Debounced client state for morning plan before first commit; merged on load when newer than tasks.';

-- One row per user per review day (enables upsert from client)
CREATE UNIQUE INDEX IF NOT EXISTS evening_reviews_user_id_review_date_key
  ON public.evening_reviews (user_id, review_date);

CREATE TABLE IF NOT EXISTS public.emergency_compose_drafts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fire_date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'hot' CHECK (severity IN ('hot', 'warm', 'contained')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fire_date)
);

CREATE INDEX IF NOT EXISTS idx_emergency_compose_drafts_updated
  ON public.emergency_compose_drafts (user_id, updated_at DESC);

ALTER TABLE public.emergency_compose_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own emergency_compose_drafts" ON public.emergency_compose_drafts;
CREATE POLICY "Users manage own emergency_compose_drafts"
  ON public.emergency_compose_drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
