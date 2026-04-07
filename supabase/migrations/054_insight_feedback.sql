-- Insight feedback: store user feedback on Mrs. Deer's daily insights (morning, evening, emergency)
-- Used to improve future prompts

CREATE TABLE IF NOT EXISTS insight_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  feedback TEXT NOT NULL CHECK (feedback IN ('helpful', 'not-helpful', 'tone-adjustment')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insight_feedback_user_id ON insight_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_feedback_insight_id ON insight_feedback(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_feedback_created_at ON insight_feedback(created_at);

ALTER TABLE insight_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON insight_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON insight_feedback FOR SELECT
  USING (auth.uid() = user_id);
