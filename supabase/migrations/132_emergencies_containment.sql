-- User-authored containment protocol (agency / dialogue with Mrs. Deer triage)
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS containment_plan TEXT,
  ADD COLUMN IF NOT EXISTS containment_plan_committed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.emergencies.containment_plan IS
  'Founder tactical response: 2–3 steps to box in the fire (draft + committed).';
COMMENT ON COLUMN public.emergencies.containment_plan_committed_at IS
  'When the user clicked Commit to Plan (checklist phase).';
