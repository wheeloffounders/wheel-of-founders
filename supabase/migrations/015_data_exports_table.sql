-- Wheel of Founders: Data Exports Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS data_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  export_type TEXT CHECK (export_type IN ('full_history', 'yearly_report', 'custom_range', 'five_year_trends')) NOT NULL,
  file_url TEXT,
  file_name TEXT,
  date_range_start DATE,
  date_range_end DATE,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_data_exports_expires ON data_exports(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports" ON data_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage exports" ON data_exports
  FOR ALL USING (auth.role() = 'service_role');
