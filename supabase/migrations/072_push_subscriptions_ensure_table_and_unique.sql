-- Ensure push_subscriptions exists with endpoint/p256dh/auth and (user_id, endpoint) unique.
-- Fixes: missing table (PGRST205), missing unique for upsert (42P10).

-- 1. Create table if it doesn't exist (final schema: no subscription column)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- 2. Ensure (user_id, endpoint) unique for upsert when table existed without it
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_id_endpoint
  ON push_subscriptions (user_id, endpoint);

-- 3. Ensure columns exist (if table was created from 058 with subscription only)
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS p256dh TEXT,
  ADD COLUMN IF NOT EXISTS auth TEXT;

-- 4. Index and RLS
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Policies (idempotent)
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage push subscriptions" ON push_subscriptions;
CREATE POLICY "Service role can manage push subscriptions"
  ON push_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
