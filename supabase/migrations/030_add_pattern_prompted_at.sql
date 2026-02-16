-- Add pattern_prompted_at to feedback_trigger_preferences
-- Tracks when Mrs. Deer pattern feedback was last shown per pattern type
-- { "prioritization": "2026-02-15T...", "overwhelm": "2026-02-14T..." }

ALTER TABLE feedback_trigger_preferences
ADD COLUMN IF NOT EXISTS pattern_prompted_at JSONB DEFAULT '{}';
