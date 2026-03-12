-- Code Scary: Error logs for custom dashboards and debugging
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  url TEXT,
  component TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Service role / admin only - no direct user access
CREATE POLICY "Service role can manage error_logs" ON error_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
