-- Explicit "day closed" flag for dashboard streaks / checkmarks (distinct from is_draft).
ALTER TABLE public.evening_reviews
  ADD COLUMN IF NOT EXISTS is_day_complete boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.evening_reviews.is_day_complete IS 'True when the founder submitted a final evening review for this review_date (loop closed).';

-- Backfill: submitted reviews count as day complete.
UPDATE public.evening_reviews
SET is_day_complete = true
WHERE is_draft IS DISTINCT FROM true
  AND is_day_complete = false;

-- If is_draft column missing in old DBs, this UPDATE may no-op; app handles missing column gracefully.
