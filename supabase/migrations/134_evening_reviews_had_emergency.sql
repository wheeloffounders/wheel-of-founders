ALTER TABLE public.evening_reviews
  ADD COLUMN IF NOT EXISTS had_emergency BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.evening_reviews.had_emergency IS 'True when any emergency was logged on review_date (analytics: fires vs mood/energy)';
