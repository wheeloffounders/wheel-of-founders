-- Optional post-mortem lesson + insight text on emergencies
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lesson_learned_raw TEXT,
  ADD COLUMN IF NOT EXISTS lesson_insight_text TEXT,
  ADD COLUMN IF NOT EXISTS lesson_saved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.emergencies.lesson_insight_text IS 'Mrs. Deer–styled one-line insight saved to user_insights from post-fire lesson';
