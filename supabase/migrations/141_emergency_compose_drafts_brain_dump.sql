-- Persist emotional "brain dump" separately from headline (what's the fire) in compose drafts.
ALTER TABLE public.emergency_compose_drafts
  ADD COLUMN IF NOT EXISTS brain_dump text NOT NULL DEFAULT '';
