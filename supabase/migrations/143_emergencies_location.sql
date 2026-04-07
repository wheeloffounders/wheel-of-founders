-- Optional human-readable place label for each emergency log (compose + history).
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS location text;

COMMENT ON COLUMN public.emergencies.location IS 'Optional user or geocoded place label (e.g. city) at time of log.';

ALTER TABLE public.emergency_compose_drafts
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
