CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_updated
  ON public.google_calendar_tokens(updated_at DESC);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access google_calendar_tokens" ON public.google_calendar_tokens;
CREATE POLICY "Service role full access google_calendar_tokens"
  ON public.google_calendar_tokens FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
