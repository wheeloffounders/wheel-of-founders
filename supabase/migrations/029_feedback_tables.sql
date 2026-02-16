-- Wheel of Founders: Feedback System
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'long_form', 'popup', 'mrs_deer')),
  screen_location TEXT,
  description TEXT NOT NULL,
  email TEXT,
  -- Long form fields (JSON for flexibility)
  whats_working TEXT,
  whats_confusing TEXT,
  features_request TEXT,
  nps_score INTEGER CHECK (nps_score >= 1 AND nps_score <= 5),
  other_thoughts TEXT,
  -- Bug report
  screenshot_url TEXT,
  -- Mrs. Deer context
  context_prefilled TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can read all feedback (for dashboard)
CREATE POLICY "Service role can read all feedback" ON feedback
  FOR SELECT USING (auth.role() = 'service_role');

-- Feedback trigger preferences: "Don't show again" per user per trigger type
CREATE TABLE IF NOT EXISTS feedback_trigger_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- JSON: { "7_days_active": true, "7_evening_reviews": true, "first_export": true, "30_days": true }
  dismissed_triggers JSONB DEFAULT '{}',
  -- When to show "Maybe Later" again: { "7_days_active": "2026-02-20", ... }
  maybe_later_until JSONB DEFAULT '{}',
  -- When each trigger was last shown (for 7-day frequency cap): { "7_days_active": "2026-02-14T..." }
  last_trigger_shown JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_trigger_prefs_user ON feedback_trigger_preferences(user_id);

ALTER TABLE feedback_trigger_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trigger prefs" ON feedback_trigger_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
