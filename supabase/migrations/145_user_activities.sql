-- Lightweight activity log for product analytics (e.g. Presence Permit claims, future Day-7 signals)

CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_type_created
  ON public.user_activities (user_id, activity_type, created_at DESC);

COMMENT ON TABLE public.user_activities IS 'Append-only user actions for volume/velocity metrics (not strategic insights).';

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own activities"
  ON public.user_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users select own activities"
  ON public.user_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
