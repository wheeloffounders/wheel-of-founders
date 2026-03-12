-- Store push subscription keys in separate columns (endpoint, p256dh, auth) instead of JSONB
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS p256dh TEXT,
  ADD COLUMN IF NOT EXISTS auth TEXT;

-- Backfill and drop subscription only if that column exists (e.g. after 058 with JSONB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'subscription'
  ) THEN
    UPDATE push_subscriptions
    SET p256dh = (subscription->'keys'->>'p256dh'), auth = (subscription->'keys'->>'auth')
    WHERE subscription IS NOT NULL
      AND (subscription->'keys'->>'p256dh') IS NOT NULL
      AND (subscription->'keys'->>'auth') IS NOT NULL;
    ALTER TABLE push_subscriptions DROP COLUMN subscription;
  END IF;
END $$;
