-- Weekly insight selections: store which wins/lessons the user found meaningful
-- Used for next week's insight: "Last week you found meaning in [wins] and learned from [lessons]"

CREATE TABLE IF NOT EXISTS weekly_insight_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  favorite_win_indices INTEGER[] DEFAULT '{}',
  key_lesson_indices INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_insight_selections_user ON weekly_insight_selections(user_id, week_start_date DESC);

ALTER TABLE weekly_insight_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own selections" ON weekly_insight_selections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
