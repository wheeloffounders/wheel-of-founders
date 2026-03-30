-- Track when user last acknowledged Founder DNA "What's New" (navbar + dashboard)

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_viewed_dna_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.user_profiles.last_viewed_dna_at IS 'Last time user dismissed Founder DNA What''s New; used to highlight new unlocks and insights.';
