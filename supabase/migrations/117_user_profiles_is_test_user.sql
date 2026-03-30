-- Load-test / simulation users: skip narrow local cron windows in eligibility (see lib/*-insight/eligible-users.ts).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.is_test_user IS 'Set only for dev load-test accounts; cron eligibility ignores Mon 00 / month-start / quarter-start windows.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_test_user
  ON public.user_profiles (is_test_user)
  WHERE is_test_user = TRUE;
