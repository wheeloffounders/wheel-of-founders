ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS complaint BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_email_logs_bounced
  ON public.email_logs (user_id, bounced)
  WHERE bounced = true;

CREATE INDEX IF NOT EXISTS idx_email_logs_complaint
  ON public.email_logs (user_id, complaint)
  WHERE complaint = true;

