-- First-touch acquisition context captured at signup (from wof_inbound_ctx cookie).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS acquisition_snapshot jsonb;

COMMENT ON COLUMN public.user_profiles.acquisition_snapshot IS
  'First-touch marketing context at signup: referrer, UTMs, first_landing_page, touch_label, recorded_at.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at_desc
  ON public.user_profiles (created_at DESC NULLS LAST);
