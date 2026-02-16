-- Wheel of Founders: Stage-Based AI System Tables
-- Run this in Supabase SQL Editor

-- Community insights (Pro tier)
CREATE TABLE IF NOT EXISTS community_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_text TEXT NOT NULL,
  stage TEXT NOT NULL, -- 'FIRE_FIGHTING_STAGE', 'SYSTEM_BUILDING_STAGE', etc.
  pattern_type TEXT,
  user_count INTEGER,
  confidence_score FLOAT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_community_insights_stage ON community_insights(stage, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_insights_expires ON community_insights(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE community_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view community insights" ON community_insights
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage community insights" ON community_insights
  FOR ALL TO service_role USING (true);

-- Personal prompts (Pro+ tier)
CREATE TABLE IF NOT EXISTS personal_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT CHECK (prompt_type IN ('morning', 'post_morning', 'post_evening', 'weekly', 'monthly')) NOT NULL,
  stage_context TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_personal_prompts_user ON personal_prompts(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_prompts_type ON personal_prompts(user_id, prompt_type, generated_at DESC);

ALTER TABLE personal_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts" ON personal_prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage prompts" ON personal_prompts
  FOR ALL TO service_role USING (true);

-- User stage tracking
CREATE TABLE IF NOT EXISTS user_stages (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_stage TEXT NOT NULL,
  stage_detected_at TIMESTAMPTZ DEFAULT NOW(),
  days_in_stage INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stages_stage ON user_stages(current_stage);

ALTER TABLE user_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stage" ON user_stages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage stages" ON user_stages
  FOR ALL TO service_role USING (true);

-- Add opt-out column to user_profiles for cross-user analysis
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS cross_user_analysis_enabled BOOLEAN DEFAULT true;
