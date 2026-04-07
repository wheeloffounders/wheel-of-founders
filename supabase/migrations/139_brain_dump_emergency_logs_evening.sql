-- Per–fire-date pressure-release dump (emergency) + evening shutdown dump (distinct from journal)

CREATE TABLE IF NOT EXISTS public.emergency_logs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fire_date DATE NOT NULL,
  brain_dump TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fire_date)
);

CREATE INDEX IF NOT EXISTS idx_emergency_logs_updated
  ON public.emergency_logs (user_id, updated_at DESC);

ALTER TABLE public.emergency_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own emergency_logs" ON public.emergency_logs;
CREATE POLICY "Users manage own emergency_logs"
  ON public.emergency_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.emergency_logs IS 'Optional brain dump per user per fire_date (pressure release before logging a fire).';

ALTER TABLE public.evening_reviews
  ADD COLUMN IF NOT EXISTS brain_dump TEXT;

COMMENT ON COLUMN public.evening_reviews.brain_dump IS 'Raw shutdown vent; distinct from structured journal.';
