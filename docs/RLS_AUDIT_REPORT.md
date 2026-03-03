# RLS Policy Audit Report

**Date:** February 2025  
**Scope:** All user data tables in `public` schema

## 1. Tables with RLS Status

| Table | RLS Enabled | User ID Column | Notes |
|-------|-------------|----------------|-------|
| **Core User Tables** | | | |
| `user_profiles` | ✅ | `id` | Users manage own profile |
| `push_subscriptions` | ✅ | `user_id` | Users manage own subscriptions |
| `user_notification_settings` | ✅ | `user_id` | Users manage own settings |
| **Daily Entry Tables** | | | |
| `morning_tasks` | ✅ | `user_id` | Hardened in 038 |
| `morning_decisions` | ✅ | `user_id` | Hardened in 038 |
| `evening_reviews` | ✅ | `user_id` | Hardened in 038 |
| `emergencies` | ✅ | `user_id` | Hardened in 038 |
| **Insights Tables** | | | |
| `personal_prompts` | ✅ | `user_id` | SELECT + INSERT |
| `insight_history` | ✅ | `user_id` | SELECT + INSERT (missing UPDATE for upsert) |
| `insight_feedback` | ✅ | `user_id` | SELECT + INSERT |
| `weekly_insight_feedback` | ✅ | `user_id` | SELECT + INSERT |
| `weekly_insight_selections` | ✅ | `user_id` | Full ALL policy |
| **Admin/Shared Tables** | | | |
| `data_exports` | ✅ | `user_id` | SELECT + INSERT + UPDATE (missing DELETE) |
| `notification_logs` | ✅ | `user_id` | Service role only ✅ |
| `community_insights` | ✅ | (none - shared) | Overly permissive policy |
| `user_insights` | ✅ | `user_id` | SELECT for users, service role for ALL |
| `personal_insights` | ✅ | `user_id` | SELECT for users, service role for ALL |
| `user_stages` | ✅ | `user_id` | SELECT for users, service role for ALL |
| **Analytics (service role only)** | | | |
| `funnel_events` | ✅ | - | Service role only |
| `user_sessions` | ✅ | - | Service role only |
| `page_views` | ✅ | - | Service role only |
| `experiments` | ✅ | - | Service role only |
| `experiment_assignments` | ✅ | - | Service role only |
| `experiment_events` | ✅ | - | Service role only |
| `user_patterns` | ✅ | - | Service role only |
| `feature_usage` | ✅ | - | Service role only |
| `daily_stats` | ✅ | - | Service role only |
| `user_cohorts` | ✅ | - | Service role only |
| `pattern_extraction_queue` | ✅ | - | Service role only |
| `analysis_logs` | ✅ | - | Service role only |
| `feedback` | ✅ | `user_id` | INSERT for users, SELECT for service role |
| `feedback_trigger_preferences` | ✅ | `user_id` | Full ALL policy |

## 2. Existing Policies Summary

### Core User Tables (✅ Secure)
- **user_profiles**: `Users can manage own profile` — FOR ALL, `auth.uid() = id`
- **push_subscriptions**: `Users can manage own push subscriptions` — FOR ALL, `auth.uid() = user_id`
- **user_notification_settings**: SELECT, UPDATE, INSERT — all restricted to `auth.uid() = user_id`

### Daily Entry Tables (✅ Secure)
- **morning_tasks, morning_decisions, evening_reviews, emergencies**: `Users can manage own *` — FOR ALL, `auth.uid() = user_id` (migration 038)

### Insights Tables
- **personal_prompts**: SELECT + INSERT (user-scoped). No UPDATE/DELETE for users (backend uses service role).
- **insight_history**: SELECT + INSERT. **Missing UPDATE** — upsert operations fail for authenticated clients.
- **insight_feedback**: SELECT + INSERT (user-scoped).
- **weekly_insight_feedback**: SELECT + INSERT (user-scoped).
- **weekly_insight_selections**: FOR ALL (user-scoped).

### Admin Tables
- **data_exports**: SELECT + INSERT + UPDATE. **Missing DELETE** (users may want to remove old exports).
- **notification_logs**: Service role only — no user access. ✅

### Community/Shared Tables
- **community_insights**: 
  - `Users can view active community insights` — `is_active = true AND (expires_at IS NULL OR expires_at > NOW())` ✅
  - `All authenticated users can view community insights` (migration 019) — **USING (true)** ❌ Overly permissive; allows viewing inactive insights.

## 3. Issues Found

### Issue 1: insight_history — Missing UPDATE Policy
**Problem:** API uses `upsert()` which requires UPDATE when a row exists. Authenticated clients (if used) would fail.

**Fix:**
```sql
CREATE POLICY "Users can update own insight history" ON insight_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Issue 2: community_insights — Overly Permissive Policy
**Problem:** Migration 019 adds `All authenticated users can view community insights` with `USING (true)`. This allows any authenticated user to see ALL rows including inactive/expired insights. Policies are OR'd, so this overrides the restrictive policy from 013.

**Fix:**
```sql
DROP POLICY IF EXISTS "All authenticated users can view community insights" ON community_insights;
```

### Issue 3: data_exports — Missing DELETE Policy (Optional)
**Problem:** Users cannot delete their own export records. If the app allows "delete my export," this would fail.

**Fix:**
```sql
CREATE POLICY "Users can delete own exports" ON data_exports
  FOR DELETE USING (auth.uid() = user_id);
```

## 4. No Tables with RLS Disabled

All user data tables have RLS enabled. Analytics tables use service role only.

## 5. Testing Checklist

- [x] All user data tables have RLS enabled
- [x] Every user table has SELECT restricted to own user_id (or appropriate scope)
- [x] Every user table has INSERT restricted to own user_id (where applicable)
- [x] Every user table has UPDATE restricted to own user_id (where applicable)
- [x] Admin tables (notification_logs) have service role only
- [ ] **Fix:** Drop overly permissive `USING (true)` policy on community_insights
- [ ] **Fix:** Add UPDATE policy to insight_history
- [ ] **Fix:** Add DELETE policy to data_exports (optional)

## 6. Verification Queries

Run in Supabase SQL Editor:

```sql
-- List all tables and RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```
