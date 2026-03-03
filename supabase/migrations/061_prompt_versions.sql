-- Prompt versions for rotation (IP protection)
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  tone_rules TEXT NOT NULL,
  banned_phrases TEXT NOT NULL,
  structure TEXT NOT NULL,
  active_from TIMESTAMPTZ NOT NULL,
  active_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON prompt_versions(active_from, active_to);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_number ON prompt_versions(version_number);

ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage prompt_versions"
  ON prompt_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
