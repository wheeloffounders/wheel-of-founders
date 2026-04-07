-- Full Mrs. Deer coach text for this fire (client updates after stream; fallback if personal_prompts row missing)
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS insight TEXT;

COMMENT ON COLUMN public.emergencies.insight IS
  'Pro+: AI coach insight for this emergency; persisted on stream complete and used when reloading the page.';
