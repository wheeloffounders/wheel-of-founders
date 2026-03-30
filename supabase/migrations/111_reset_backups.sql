-- Temporary backups for reset undo (short-lived).
CREATE TABLE IF NOT EXISTS public.reset_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_backups_user_expires
  ON public.reset_backups(user_id, expires_at DESC);

ALTER TABLE public.reset_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reset backups" ON public.reset_backups;
CREATE POLICY "Users can view own reset backups"
  ON public.reset_backups
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage reset backups" ON public.reset_backups;
CREATE POLICY "Service role can manage reset backups"
  ON public.reset_backups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
