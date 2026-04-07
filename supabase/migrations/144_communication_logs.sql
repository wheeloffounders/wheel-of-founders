-- Resend outreach tracking (parallel to email_logs; updated via webhooks).
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT,
  resend_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_user_sent_at
  ON public.communication_logs (user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_resend_id
  ON public.communication_logs (resend_id)
  WHERE resend_id IS NOT NULL;

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.communication_logs IS 'Transactional email outreach rows; resend_id matches Resend API id for webhook updates.';
