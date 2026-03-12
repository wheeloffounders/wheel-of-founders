-- Fix: "duplicate key value violates unique constraint 'push_subscriptions_user_id_key'"
-- The table must allow multiple rows per user (one per device/endpoint). Drop the single-column
-- unique on user_id if it exists so upsert with ON CONFLICT (user_id, endpoint) works.

ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Ensure (user_id, endpoint) unique exists for upsert (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_id_endpoint
  ON push_subscriptions (user_id, endpoint);
