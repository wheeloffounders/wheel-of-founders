-- Track which morning/evening reminder copy variants were sent (avoid repeats within 30 days)

CREATE TABLE IF NOT EXISTS public.user_email_variation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  variation_id INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_email_variation_log_user_type_sent
  ON public.user_email_variation_log (user_id, email_type, sent_at DESC);

COMMENT ON TABLE public.user_email_variation_log IS 'Reminder email A/B body variant ids (1–20) for anti-repeat selection';
