-- Wheel of Founders: Community Insights Table (Smart Constraint Engine)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS community_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('productivity', 'focus', 'decision', 'prevention', 'pattern')),
  data_based_on TEXT DEFAULT 'Patterns from fellow founders',
  relevance_score INTEGER DEFAULT 1 CHECK (relevance_score >= 1 AND relevance_score <= 5),
  times_shown INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_community_insights_active ON community_insights(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_community_insights_category ON community_insights(category, is_active);

ALTER TABLE community_insights ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active insights
CREATE POLICY "Users can view active community insights" ON community_insights
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Service role can manage insights
CREATE POLICY "Service role can manage community insights" ON community_insights
  FOR ALL USING (auth.role() = 'service_role');

-- Add opt-out column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS community_insights_enabled BOOLEAN DEFAULT true;

-- Update existing users to have community insights enabled by default
UPDATE user_profiles
SET community_insights_enabled = true
WHERE community_insights_enabled IS NULL;
