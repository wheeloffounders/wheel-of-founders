-- Security alerts from honeypot monitoring
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  data JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_ack ON security_alerts(acknowledged);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage security_alerts"
  ON security_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
