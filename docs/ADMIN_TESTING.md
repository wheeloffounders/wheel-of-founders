# Admin Access Testing Guide

Use this checklist to verify admin protection and data isolation with a **fresh (non-admin) account**.

---

## 1. Create a fresh test account

1. Sign out of any existing account (or use an incognito/private window).
2. Go to `/login` and sign up with a **new email** (e.g. `test-nonadmin@example.com`).
3. Complete sign-up and land on the dashboard.

This user should **not** have `is_admin: true` in `user_profiles` (unless you explicitly set it in the DB).

---

## 2. Verify non-admin cannot access admin routes

Try opening each URL while logged in as the test user. You should be **redirected** (to login or dashboard), not see admin content.

| URL | Expected result |
|-----|-----------------|
| `/admin` | Redirect to login or dashboard (no admin dashboard). |
| `/admin/experiments` | Redirect to `/` (dashboard). |
| `/admin/cross-user-analytics` | Redirect to `/` (dashboard). |
| `/admin/analytics` | Redirect to `/` (dashboard). |

**Quick test:** Navigate to `/admin/experiments`. You should end up on `/` (home) with no flash of admin content.

---

## 3. Verify normal flows work for the test user

Confirm the test user can use the app as a normal user:

- [ ] **Morning** – Open `/morning`, add a task, save. Data saves and appears only for this user.
- [ ] **Evening** – Open `/evening`, complete a review. Data is scoped to this user.
- [ ] **Profile** – Open `/profile`, update name or settings. Changes apply only to this user.
- [ ] **Dashboard** – Open `/`. Only this user’s data (e.g. streak, today’s plan) is shown.

---

## 4. Verify data isolation

- **As test user:** Create some morning tasks or evening reviews.
- **As admin user:** Log in with your admin account. In **Cross-User Analytics** you may see aggregated stats, but you must **not** see the test user’s raw private data (e.g. exact task text or email) unless the feature is designed to show anonymized/aggregated data only.
- **As test user again:** Confirm you only see your own data on `/morning`, `/evening`, `/history`, etc.

RLS (Row Level Security) on Supabase should enforce that each user can only read/write their own rows in `morning_tasks`, `evening_reviews`, `user_profiles`, etc. Admin routes use the **service role** or server-side checks to read aggregated data, not other users’ private rows in a way that exposes PII.

---

## 5. Optional: Verify admin still works

Log back in as your **admin** account (e.g. the one with `is_admin: true` in `user_profiles`):

- [ ] `/admin` loads and shows the admin dashboard with links.
- [ ] `/admin/experiments` loads.
- [ ] `/admin/cross-user-analytics` loads and shows data (or “no data” if empty).
- [ ] `/admin/analytics` loads (overview / funnels / retention, etc.).

---

## Summary

| Check | Pass criteria |
|-------|----------------|
| Non-admin cannot access `/admin/*` | Redirect to `/` or login, no admin UI. |
| Non-admin can use app | Morning, evening, profile, dashboard work. |
| Data isolation | Each user sees only their own data on user-facing pages. |
| Admin can access admin routes | Admin user can open all admin pages. |

If any step fails, check:

- `user_profiles.is_admin` is `false` for the test user (Supabase Table Editor).
- No hardcoded bypass (e.g. founder email) that would grant the test user access.
- RLS policies on `morning_tasks`, `evening_reviews`, and related tables restrict by `auth.uid()` / `user_id`.
