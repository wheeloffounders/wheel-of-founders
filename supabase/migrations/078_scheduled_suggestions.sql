-- Scheduled decision suggestions: pre-generated the night before and stored for morning display
CREATE TABLE IF NOT EXISTS scheduled_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_date date NOT NULL,
  suggestion_type text NOT NULL DEFAULT 'decision_suggestion',
  content jsonb NOT NULL,
  based_on text NOT NULL DEFAULT 'patterns/profile',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_suggestions_user_date_type
  ON scheduled_suggestions(user_id, suggestion_date, suggestion_type);

ALTER TABLE scheduled_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled suggestions"
  ON scheduled_suggestions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
