-- Add incremental lifetime counter for quick-win completions.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS total_quick_wins INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_profiles.total_quick_wins
IS 'Lifetime quick-win completions used for behavior badge unlocks.';
