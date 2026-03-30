-- Key/value store for cron batch cursors (service role only in app; RLS blocks direct client access).

CREATE TABLE IF NOT EXISTS public.cron_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cron_state_updated_at_idx ON public.cron_state (updated_at DESC);

ALTER TABLE public.cron_state ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.cron_state IS 'Internal cron progress keys (e.g. weekly insight batch cursor). Access via service role only.';
