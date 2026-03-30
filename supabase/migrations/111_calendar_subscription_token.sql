ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS calendar_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_calendar_token_unique
  ON public.user_profiles (calendar_token)
  WHERE calendar_token IS NOT NULL;

