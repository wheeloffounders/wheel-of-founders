# Streak calculation

## Where it runs

- **`lib/streak-calculate.ts`** — `calculateStreakForUser(db, userId)` loads `evening_reviews`, `morning_tasks`, `morning_decisions`, merges dates, computes streak, **upserts** `user_profiles.current_streak`, `longest_streak`, `last_review_date`.
- **Dashboard** — `JourneyProgress` calls `calculateStreak()` (browser client) on load, after progress fetch, and on `data-sync-request`.
- **Evening save** — `app/evening/page.tsx` calls `calculateStreak()` after a successful review save.
- **Journey API** — `GET /api/founder-dna/journey` runs `calculateStreakForUser` with the service-role client so milestones match recalculated values.

## Rules

1. **Founder day** — Anchor uses `getEffectivePlanDate()` (before 4am local = previous calendar day), same as dashboard/evening links.
2. **Full loop** — A streak day requires **both** an evening review and morning activity (task or decision) on that date.
3. **Legacy** — If there are **no** morning rows at all, streak falls back to **evening-only** consecutive days so long-time users are not forced to zero.
4. **“Today” not required for display** — If you haven’t finished tonight yet, the chain still counts through **yesterday** so the number doesn’t drop to zero at 9am.

## Why it looked “stuck” at 30

Older `lib/streak.ts` required an evening on **calendar** `today` and counted from midnight-aligned “today”, which broke after midnight and never aligned with founder-day. The UI also read **only** `user_profiles.current_streak` without recalculating, so stale DB values persisted.
