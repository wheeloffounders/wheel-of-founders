/* Beta retirement + developer subscription override (Pro / Free / timer). */

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_override text NOT NULL DEFAULT 'none';

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_override_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_override_check
  CHECK (subscription_override IN ('pro', 'free', 'none'));

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_beta_retired boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_beta boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_profiles.subscription_override IS
  'Developer or support: pro = always Pro UI, free = always paywalled, none = normal trial/subscription rules.';

COMMENT ON COLUMN public.user_profiles.is_beta_retired IS
  'One-time legacy flag: when false, next login starts 7-day trial window and clears unlimited beta tier behavior.';

COMMENT ON COLUMN public.user_profiles.is_beta IS
  'Legacy companion to tier=beta; cleared when beta period is retired.';
