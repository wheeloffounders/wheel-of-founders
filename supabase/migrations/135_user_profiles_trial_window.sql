-- 7-day Pro trial window + defaults for new profiles (analytics + entitlement)

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.trial_starts_at IS 'When the current/last Pro trial window began';
COMMENT ON COLUMN user_profiles.trial_ends_at IS 'When the Pro trial expires (exclusive of entitlement after this time unless subscribed)';

CREATE OR REPLACE FUNCTION public.handle_user_profiles_default_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_starts_at IS NULL AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_starts_at := now();
    NEW.trial_ends_at := now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_profiles_set_trial ON user_profiles;
CREATE TRIGGER on_user_profiles_set_trial
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profiles_default_trial();
