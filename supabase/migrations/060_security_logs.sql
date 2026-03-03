-- Security logs for signature failures, honeypot triggers, etc.
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/select (API routes use service role)
CREATE POLICY "Service role can manage security logs"
  ON security_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
