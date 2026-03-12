# Push Notifications – Schema & Troubleshooting

## Required table schema

The `push_subscriptions` table must allow **multiple rows per user** (one per device/browser). Use this schema:

```sql
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_id_endpoint
  ON push_subscriptions (user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage push subscriptions" ON push_subscriptions;
CREATE POLICY "Service role can manage push subscriptions"
  ON push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Important:

- Columns: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `updated_at` (no `subscription` JSONB).
- There must be a **unique constraint on `(user_id, endpoint)`** so the API’s upsert with `ON CONFLICT (user_id, endpoint)` works.
- There must **not** be a unique constraint on `user_id` only (e.g. `push_subscriptions_user_id_key`), or you’ll get “duplicate key” when the same user enables push on a second device.

## Migrations in this repo

Apply in order:

1. **058** – Creates table with `subscription` JSONB and `UNIQUE(user_id, endpoint)`.
2. **071** – Adds `p256dh`/`auth`, backfills from `subscription`, drops `subscription`.
3. **072** – Ensures table exists with correct columns and unique index; RLS and policies.
4. **073** – Drops `push_subscriptions_user_id_key` if present so multiple rows per user are allowed.

If your database was created manually or only has a unique on `user_id`, run **073** (or the “Fix duplicate key” block below).

## One-off fix for “duplicate key … push_subscriptions_user_id_key”

If you see:

```text
duplicate key value violates unique constraint 'push_subscriptions_user_id_key'
```

run:

```sql
ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_id_endpoint
  ON push_subscriptions (user_id, endpoint);
```

Then reload the Supabase schema cache (Dashboard → Settings → API → “Reload schema” or restart API).

## Error checklist

| Error | Cause | Fix |
|-------|--------|-----|
| Table `push_subscriptions` not in schema cache | Table missing or API cache stale | Run migrations 058 + 071 + 072 (or full schema above). Reload schema / restart API. |
| Column `endpoint` / `p256dh` / `auth` not found | Old schema (only `subscription` JSONB) | Run 071 and 072. |
| Column `subscription` not found | New schema; code still expects JSONB | App is already updated; ensure DB has `endpoint`, `p256dh`, `auth`. |
| No unique constraint for ON CONFLICT | No unique on `(user_id, endpoint)` | Run 072 and 073 (or create unique index above). |
| duplicate key … `push_subscriptions_user_id_key` | Unique on `user_id` only | Run 073 or the one-off SQL above. |

## API routes

- **POST /api/push/subscribe** – Expects body `{ endpoint, keys: { p256dh, auth } }`. Upserts with `onConflict: 'user_id,endpoint'`. Returns 409 with a clear message if the DB still has `push_subscriptions_user_id_key`.
- **POST /api/notifications/test** – Sends one test push to the current user’s subscriptions (auth required).

## How to test

1. Apply migrations (or the full schema + 073 fix) and reload schema.
2. In the app: Settings → Notifications, click “Enable Notifications” and allow the browser permission.
3. Confirm no 500/409 from `/api/push/subscribe`; you should see “Notifications enabled!” (or similar).
4. (Dev only) Click “Send Test Notification (Dev Only)” and confirm a push is received.
5. Optional: In Supabase SQL editor, `SELECT * FROM push_subscriptions;` – you should see one row per user/endpoint with `endpoint`, `p256dh`, `auth` filled.

## Env

- Client: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Server: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:support@example.com`)
