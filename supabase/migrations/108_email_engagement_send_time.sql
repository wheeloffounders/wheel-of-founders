ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS engagement_score NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_send_hour SMALLINT,
ADD COLUMN IF NOT EXISTS best_send_confidence NUMERIC(4,3),
ADD COLUMN IF NOT EXISTS last_email_open_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_best_send_hour
  ON public.user_profiles (best_send_hour)
  WHERE best_send_hour IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_email_open_at
  ON public.user_profiles (last_email_open_at DESC)
  WHERE last_email_open_at IS NOT NULL;

