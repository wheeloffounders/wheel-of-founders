-- Wheel of Founders: Evening Reviews Table (Journal + Emotional check-in)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS evening_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  journal TEXT DEFAULT '',
  mood SMALLINT CHECK (mood >= 1 AND mood <= 5),
  energy SMALLINT CHECK (energy >= 1 AND energy <= 5),
  wins TEXT DEFAULT '',
  lessons TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evening_reviews_review_date ON evening_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_evening_reviews_user_date ON evening_reviews(user_id, review_date);

ALTER TABLE evening_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for evening_reviews" ON evening_reviews
  FOR ALL USING (true) WITH CHECK (true);
