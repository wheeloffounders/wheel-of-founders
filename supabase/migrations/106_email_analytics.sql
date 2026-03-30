-- Phase 2: email open/click analytics

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('opened', 'clicked')),
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_log_id
  ON public.email_events(email_log_id);

CREATE INDEX IF NOT EXISTS idx_email_events_user_id
  ON public.email_events(user_id);

CREATE INDEX IF NOT EXISTS idx_email_events_created
  ON public.email_events(created_at);

