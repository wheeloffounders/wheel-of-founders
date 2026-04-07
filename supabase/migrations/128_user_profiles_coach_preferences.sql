-- Mrs. Deer tone calibration (PATCH from morning/evening insight cards)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS coach_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.coach_preferences IS
  'JSONB: AI personalization — e.g. tone_directive, tone_calibration_note, tone_calibration_note_at, tone_calibration_insight_id.';
