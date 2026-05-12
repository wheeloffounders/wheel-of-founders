-- Blog / homepage interactive funnel → Pro trial gift (explicit flag for analytics + UX)

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_pro_trial BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.is_pro_trial IS
  'True when the user activated the 7-day Pro trial via blog or homepage funnel handoff (trial window also in trial_starts_at / trial_ends_at).';
