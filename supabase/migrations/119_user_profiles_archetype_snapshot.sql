-- Stable Founder Archetype (full): snapshot + last compute time for 60-day refresh cadence.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS archetype_snapshot JSONB,
ADD COLUMN IF NOT EXISTS archetype_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.archetype_snapshot IS
  'Last computed full archetype API payload (no unlockChecklist). Refreshed every 60 days or manual refresh.';
COMMENT ON COLUMN public.user_profiles.archetype_updated_at IS
  'When archetype_snapshot was last computed.';
