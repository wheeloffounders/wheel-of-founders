-- Track scheduled refresh timestamps + optional cached snapshots per Founder DNA feature.
-- Keys (app-side): energy_mood, your_story, unseen_wins, decision_style, celebration_gap, postponement, recurring_question
-- Value shape: { "at": "<ISO8601>", "snapshot": <optional JSON> }

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_refreshed JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.last_refreshed IS
  'Founder DNA feature refresh: { key: { at: ISO string, snapshot?: any } }. Used for Tue/Wed + 7d gates.';
