-- Duo Plan: relationships, tracking, and user_profiles columns
-- plan_type and duo_relationship_id live on user_profiles (no separate subscriptions table)

-- Duo relationships table
CREATE TABLE IF NOT EXISTS duo_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secondary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one pending or active duo per primary user
CREATE UNIQUE INDEX IF NOT EXISTS idx_duo_relationships_primary_active
  ON duo_relationships(primary_user_id)
  WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_duo_relationships_primary ON duo_relationships(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_duo_relationships_secondary ON duo_relationships(secondary_user_id);
CREATE INDEX IF NOT EXISTS idx_duo_relationships_status ON duo_relationships(status);
CREATE INDEX IF NOT EXISTS idx_duo_relationships_invited ON duo_relationships(invited_email);

ALTER TABLE duo_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own duo relationships"
  ON duo_relationships FOR SELECT
  USING (auth.uid() = primary_user_id OR auth.uid() = secondary_user_id);

CREATE POLICY "Primary can insert duo invite"
  ON duo_relationships FOR INSERT
  WITH CHECK (auth.uid() = primary_user_id);

CREATE POLICY "Primary can update own duo"
  ON duo_relationships FOR UPDATE
  USING (auth.uid() = primary_user_id);

-- Add plan type and duo reference to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS duo_relationship_id UUID REFERENCES duo_relationships(id);

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_plan_type_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_plan_type_check
CHECK (plan_type IN ('individual', 'duo_primary', 'duo_secondary'));

-- Add last_duo_reminder to user_profiles for tracking prompts
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_duo_reminder TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duo_reminder_count INTEGER DEFAULT 0;
