-- Micro-lesson impressions: track which lessons are shown and outcomes for learning loop
CREATE TABLE IF NOT EXISTS public.micro_lesson_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  situation text NOT NULL,
  lesson_message text NOT NULL,
  action_taken boolean DEFAULT false,
  completed_evening boolean DEFAULT false,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_lesson_impressions_user_id ON micro_lesson_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_lesson_impressions_viewed_at ON micro_lesson_impressions(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_lesson_impressions_situation ON micro_lesson_impressions(situation);

ALTER TABLE public.micro_lesson_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own micro_lesson_impressions"
  ON micro_lesson_impressions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own micro_lesson_impressions"
  ON micro_lesson_impressions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage micro_lesson_impressions"
  ON micro_lesson_impressions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
