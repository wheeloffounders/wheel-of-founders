# Founder DNA weekly refresh (Tuesday) — debugging

## What was fixed (calendar vs ms)

`shouldRefreshFounderFeature` used `Math.floor((now - lastAt) / 86400000)`. That can be **6** on the next Tuesday after a Tuesday refresh if times-of-day differ (e.g. last Tue 18:00 → next Tue 09:00), so the scheduled refresh **skipped** and `nextUpdate` jumped an extra week.

Refresh spacing is now **calendar days** in the user’s IANA timezone (or `UTC`), via `calendarDaysBetweenInTimeZone`, and weekday checks always use `getLocalDayOfWeekSun0(now, tz)` with `tz = userTimeZone || 'UTC'`.

`nextEligibleRefreshDateUTC` / `nextEligibleRefreshDateInTimeZone` use **last refresh date + N calendar days** before searching for the next target weekday (not `lastAt + N × 24h`).

## Supabase: inspect `last_refreshed`

```sql
SELECT
  id,
  last_refreshed->'your_story' AS your_story,
  last_refreshed->'unseen_wins' AS unseen_wins,
  last_refreshed->'your_story'->>'at' AS your_story_at,
  last_refreshed->'unseen_wins'->>'at' AS unseen_wins_at,
  timezone
FROM user_profiles
WHERE id = '<user-uuid>';
```

## Force regeneration (local / staging / preview)

```bash
YOUR_STORY_FORCE_REGENERATE=1
UNSEEN_WINS_FORCE_REGENERATE=1
DECISION_STYLE_FORCE_REGENERATE=1
POSTPONEMENT_FORCE_REGENERATE=1
```

- **Your Story:** `GET /api/founder-dna/your-story`
- **Unseen Wins:** `POST /api/founder-dna/unseen-wins/refresh`
- **Decision style:** `GET /api/founder-dna/decisions`
- **Postponement patterns:** `GET /api/founder-dna/postponements`

Remove after testing.

## Extra timezone logs

Set `DEBUG_TIMEZONE=1` or `NEXT_PUBLIC_DEBUG_TIMEZONE=1` to append `todayYmd` / `lastYmd` in the user zone to each `[Feature] ===== REFRESH CHECK =====` block.

## Calendar-days debug API

`GET /api/debug/calendar-days?lastAt=<ISO>&tz=<IANA>` (auth required). Enabled when `DEBUG_CALENDAR_DAYS_API=1` **or** `NODE_ENV !== 'production'`.

On Vercel preview (`NODE_ENV=production`), set `DEBUG_CALENDAR_DAYS_API=1`.

## Logs

`GET /api/founder-dna/your-story` logs `calendarDaysSinceLastAt` and `userTimeZone` with the branch decision.
