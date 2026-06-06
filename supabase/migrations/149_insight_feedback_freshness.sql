-- Mrs. Deer freshness calibration (daily insight boredom signal)
ALTER TABLE public.insight_feedback
  DROP CONSTRAINT IF EXISTS insight_feedback_feedback_check;

ALTER TABLE public.insight_feedback
  ADD CONSTRAINT insight_feedback_feedback_check
  CHECK (feedback IN (
    'helpful',
    'not-helpful',
    'tone-adjustment',
    'felt-fresh',
    'felt-same',
    'too-long'
  ));

COMMENT ON COLUMN public.insight_feedback.feedback IS
  'helpful | not-helpful | tone-adjustment | felt-fresh | felt-same | too-long';
