# Progressive unlock timeline (Wheel of Founders)

Account age is measured in **calendar days since signup** in the user’s **`user_profiles.timezone`** (IANA), not UTC midnight math (`daysActive`).

## At-a-glance (by day)

| Approx. day | Unlock |
|-------------|--------|
| **1** | First morning reflection → **First Day** badge (`first_spark`) |
| **1** (evening) | First evening reflection → **First Glimpse** |
| **Any** (when done) | **Founder Story** badge — complete profile (`profile_completed_at`) |
| **2** | **Morning insights** (Mrs. Deer on `/morning`) |
| **3** | **Your Story So Far** (Rhythm hub) |
| **4** | **Weekly Insight** (`/weekly`) — then **every Monday 00:00** in your timezone (hourly cron) |
| **5** | **Celebration Gap** (Rhythm) |
| **7** | **Unseen Wins** (Rhythm) |
| **9** | **Energy & Mood** trend (Patterns) |
| **12** | **Decision Style** (Patterns) |
| **14** | **Monthly Insight** (`/monthly-insight`) — then **1st of month 00:00** your time (hourly cron) |
| **15** | **Postponement Patterns** (Patterns) |
| **18** | **Recurring Question** (Patterns) |
| **21** | **Founder Archetype** preview |
| **30** | **Founder Archetype** full + ~90d refresh cadence |
| **45** | **Quarterly Trajectory** (`/quarterly`) — then **Jan / Apr / Jul / Oct 1** 00:00 your time (hourly cron) |

## Rhythm vs Patterns

- **Rhythm** (mostly **Tuesday** in the user’s timezone): story, celebration gap, unseen wins.  
- **Patterns** (mostly **Wednesday** in the user’s timezone): energy/mood, decision style, postponement, recurring question.

Insight **pages** use **account-age calendar days** in the user’s timezone; crons run **hourly** and only process users when local Monday 00:xx (weekly), local 1st 00:xx (monthly), or local quarter-start 00:xx (quarterly).

Helpers: `lib/timezone.ts`, `lib/founder-dna/update-schedule.ts` (optional `userTimeZone` on refresh checks).

## Code sources

- Thresholds: `lib/founder-dna/unlock-schedule-config.ts`
- Journey + auto-unlock writes: `app/api/founder-dna/journey/route.ts`
- Schedule rows (UI copy + `nextUpdateAt` hints): `lib/founder-dna/compute-founder-dna-schedule.ts`
- Insight page gates: `lib/progress.ts`, `app/weekly/page.tsx`, `app/monthly-insight/page.tsx`, `app/quarterly/page.tsx`
