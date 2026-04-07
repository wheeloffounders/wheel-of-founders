-- Structured Hold/Pivot/Drop triage for Hot emergencies (Circuit Breaker)
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS triage_json JSONB;

COMMENT ON COLUMN public.emergencies.triage_json IS
  'Mrs. Deer triage: oneSafeStep, pausedNeedleMovers, strategy, encouragement (Hot fires).';
