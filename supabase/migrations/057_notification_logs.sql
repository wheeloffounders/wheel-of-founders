-- Notification logs for debugging and audit
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/select (cron jobs)
CREATE POLICY "Service role can manage notification logs"
  ON notification_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
