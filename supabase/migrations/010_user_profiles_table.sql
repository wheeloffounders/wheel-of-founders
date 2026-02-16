-- Wheel of Founders: User Profiles Table (Streak + Email Preferences)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_review_date DATE,
  weekly_email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_review_date ON user_profiles(last_review_date);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Function to calculate and update streak
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  streak_count INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_review BOOLEAN;
BEGIN
  -- Check if user has a review today
  SELECT EXISTS (
    SELECT 1 FROM evening_reviews 
    WHERE user_id = user_uuid 
    AND review_date = CURRENT_DATE
  ) INTO has_review;
  
  IF NOT has_review THEN
    -- No review today, streak is broken
    UPDATE user_profiles 
    SET current_streak = 0,
        updated_at = now()
    WHERE id = user_uuid;
    RETURN 0;
  END IF;
  
  -- Count consecutive days backwards from today
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM evening_reviews 
      WHERE user_id = user_uuid 
      AND review_date = check_date
    ) INTO has_review;
    
    IF NOT has_review THEN
      EXIT;
    END IF;
    
    streak_count := streak_count + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;
  
  -- Update streak in user_profiles
  UPDATE user_profiles
  SET current_streak = streak_count,
      last_review_date = CURRENT_DATE,
      longest_streak = GREATEST(longest_streak, streak_count),
      updated_at = now()
  WHERE id = user_uuid;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO user_profiles (id, current_streak, longest_streak, last_review_date)
    VALUES (user_uuid, streak_count, streak_count, CURRENT_DATE)
    ON CONFLICT (id) DO UPDATE SET
      current_streak = streak_count,
      longest_streak = GREATEST(user_profiles.longest_streak, streak_count),
      last_review_date = CURRENT_DATE,
      updated_at = now();
  END IF;
  
  RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
