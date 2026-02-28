# Database Schema Fix – 400 Errors

If you see errors like:
- `column user_profiles.weekly_email_enabled does not exist`
- `column user_profiles.timezone_offset does not exist`
- Timezone queries failing
- User preferences not saving

Apply the repair migration below.

---

## Quick Fix: Run Repair Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Paste and run the contents of `supabase/migrations/043_repair_user_profiles_columns.sql`

Or run this SQL directly:

```sql
-- Repair: Ensure all user_profiles columns exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS welcome_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS export_notification_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS community_insights_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS planning_mode TEXT DEFAULT 'full';

UPDATE user_profiles SET weekly_email_enabled = true WHERE weekly_email_enabled IS NULL;
UPDATE user_profiles SET welcome_email_enabled = true WHERE welcome_email_enabled IS NULL;
UPDATE user_profiles SET export_notification_enabled = true WHERE export_notification_enabled IS NULL;
UPDATE user_profiles SET community_insights_enabled = true WHERE community_insights_enabled IS NULL;
UPDATE user_profiles SET timezone = 'UTC' WHERE timezone IS NULL;
UPDATE user_profiles SET timezone_offset = 0 WHERE timezone_offset IS NULL;
UPDATE user_profiles SET planning_mode = 'full' WHERE planning_mode IS NULL;
```

---

## Timezone-only Quick Fix

If you only need the timezone columns (e.g. timezone save fails with 400):

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ;

UPDATE user_profiles SET timezone = 'UTC' WHERE timezone IS NULL;
UPDATE user_profiles SET timezone_offset = 0 WHERE timezone_offset IS NULL;
```

Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name LIKE 'timezone%' ORDER BY column_name;`

---

## Verify Columns Exist

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY column_name;
```

You should see: `weekly_email_enabled`, `welcome_email_enabled`, `export_notification_enabled`, `community_insights_enabled`, `timezone`, `timezone_offset`, `timezone_detected_at`, etc.

---

## RLS Policy Repair (if updates are blocked)

If you see "RLS policy doesn't allow updates" when saving timezone or preferences:

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
CREATE POLICY "Users can manage own profile"
ON user_profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

Check existing policies: `SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'user_profiles';`

**Note:** The timezone API uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). If that env var isn't set, the API falls back to the anon key and RLS applies—ensure the policy above exists and `auth.uid()` matches the user.

---

## After Applying

1. Restart your dev server
2. Try saving timezone on `/settings/timezone` – should work without 400/401
3. Check weekly/monthly pages – should have proper data
