-- Extend insight_feedback.feedback CHECK for Plan Review tone calibration (same table as Spot on / not-helpful).
-- Replaces removed 129_insight_feedback_tone_adjustment.sql (same ALTER). Idempotent if that migration already ran.
ALTER TABLE public.insight_feedback
  DROP CONSTRAINT IF EXISTS insight_feedback_feedback_check;

ALTER TABLE public.insight_feedback
  ADD CONSTRAINT insight_feedback_feedback_check
  CHECK (feedback IN ('helpful', 'not-helpful', 'tone-adjustment'));

COMMENT ON COLUMN public.insight_feedback.feedback IS
  'helpful | not-helpful | tone-adjustment (free-text in feedback_text; tone-adjustment also merged into user_profiles.coach_preferences by API).';
