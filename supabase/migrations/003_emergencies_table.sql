-- Wheel of Founders: Emergencies Table (Firefighter mode)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fire_date DATE NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('hot', 'warm', 'contained')) DEFAULT 'hot',
  notes TEXT DEFAULT '',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergencies_fire_date ON emergencies(fire_date);
CREATE INDEX IF NOT EXISTS idx_emergencies_user_date ON emergencies(user_id, fire_date);

ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for emergencies" ON emergencies
  FOR ALL USING (true) WITH CHECK (true);
