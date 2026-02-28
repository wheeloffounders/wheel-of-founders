-- Weekly insight feedback: store user feedback on Mrs. Deer's weekly reflections
-- Used to improve future prompts with "what this user said mattered"

CREATE TABLE IF NOT EXISTS weekly_insight_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_quite_right', 'custom')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_insight_feedback_user ON weekly_insight_feedback(user_id, created_at DESC);

ALTER TABLE weekly_insight_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON weekly_insight_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback" ON weekly_insight_feedback
  FOR SELECT USING (auth.uid() = user_id);
