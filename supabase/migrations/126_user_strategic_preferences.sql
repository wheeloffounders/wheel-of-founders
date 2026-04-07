-- Pro "Strategic Memory": user-refined How/Why snippets keyed by normalized task title
CREATE TABLE IF NOT EXISTS public.user_strategic_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_title_normalized TEXT NOT NULL,
  task_title_snapshot TEXT NOT NULL,
  preference_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_strategic_preferences_user_title_key UNIQUE (user_id, task_title_normalized)
);

CREATE INDEX IF NOT EXISTS idx_user_strategic_preferences_user_id
  ON public.user_strategic_preferences (user_id);

ALTER TABLE public.user_strategic_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own strategic preferences"
  ON public.user_strategic_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_strategic_preferences IS 'Pro: Mrs. Deer remembers per-task refinements (Revise) for ghostwriter context.';
