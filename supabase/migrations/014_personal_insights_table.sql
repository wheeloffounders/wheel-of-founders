-- Wheel of Founders: Personal Insights Table (Personalized Smart Constraints)
-- Run this in Supabase SQL Editor
-- REPLACES community_insights approach with personalized insights

CREATE TABLE IF NOT EXISTS personal_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_text TEXT NOT NULL,
  insight_type TEXT CHECK (insight_type IN ('pattern', 'archetype', 'nudge', 'prevention')),
  is_actionable BOOLEAN DEFAULT true,
  data_based_on TEXT DEFAULT 'Based on your recent patterns',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(user_id, insight_text)
);

CREATE INDEX IF NOT EXISTS idx_personal_insights_user_date ON personal_insights(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_insights_user_type ON personal_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_personal_insights_expires ON personal_insights(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE personal_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal insights" ON personal_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage personal insights" ON personal_insights
  FOR ALL USING (auth.role() = 'service_role');

-- Remove community_insights_enabled (not needed for personal insights)
-- Keep it for now to avoid breaking existing users, but it's not used
