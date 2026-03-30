# Weekly Insights – Why don’t I see the latest week?

## How it works

- **Cron:** Runs **every Monday at 00:00 UTC** (`0 0 * * 1` in `vercel.json`).
- **Week generated:** Always the **previous** week (Monday–Sunday that just ended).
  - Example: When the cron runs at **Monday March 9 00:00 UTC**, it generates for **March 2 – March 8** (the week that just ended).
  - So on **March 9 at 3am** (in most timezones), the cron has already run and the **March 2 – March 8** insight should be available.

## Why a week might not show up

1. **Periods API didn’t include that week**  
   The dropdown / redirect uses `/api/insights/periods?type=weekly`, which used to only look at `personal_prompts` and `insight_history`. If the cron wrote only to `weekly_insights` (e.g. no wins/lessons so no AI insight was saved to `personal_prompts`), that week never appeared in the list.  
   **Fix:** The periods API now also includes `weekly_insights.week_start` for `type=weekly`, so any week that has a row in `weekly_insights` will show up.

2. **Cron hasn’t run yet (timezone)**  
   Cron is **00:00 Monday UTC**. In your local time that may still be Sunday (e.g. Sunday 4:00pm PST). So “Monday 3:05am” in PST is **after** the cron (it ran Sunday 4pm PST). If you’re in a timezone where Monday 3:05am is **before** 00:00 Monday UTC, the cron hasn’t run and the new week won’t exist yet.

3. **Cron failed or wasn’t triggered**  
   Check Vercel (or your host) cron logs for `/api/cron/generate-weekly-insights`. It must be called with `Authorization: Bearer <CRON_SECRET>`.

4. **401 Unauthorized on cron (most common production issue)**  
   Vercel only sends `Authorization: Bearer <CRON_SECRET>` if **`CRON_SECRET` is set** in the project environment. If it’s missing or **has leading/trailing whitespace**, every run returns **401** and no insights are generated.  
   - Fix: `scripts/fix-cron-secret.sh` or `docs/DEPLOYMENT_ENV_VARS.md`  
   - The route now **trims** `CRON_SECRET` and the `Authorization` header when comparing.

5. **Cron status (ops)**  
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR_APP_URL/api/cron/status"
   ```  
   Returns DB heuristics (`latestWeeklyInsightRow`, count for expected `week_start`) and the UTC schedule.  
   Optional Sentry ping when data looks stale: append `?notify=1` (use sparingly, e.g. from an external monitor).

6. **Client fallback vs cron**  
   `/weekly` without `?weekStart` may call `POST /api/weekly-insight/generate-last-week` **once per tab session per completed week** (sessionStorage key) if the last completed week is missing — so repeated refreshes on the same device won’t spam the API; opening a new tab can try again.

7. **No wins/lessons for that week**  
   If the user had no evening wins or lessons in that week, the batch returns early and does **not** insert into `personal_prompts`. The cron still upserts `weekly_insights` (with `insight_text` null and possibly `unseen_wins_pattern`). With the periods fix above, that week now appears because we include `weekly_insights.week_start`.

## Quick checks (Supabase / DB)

```sql
-- Weeks we have for a user (replace USER_ID)
SELECT week_start, week_end, insight_text IS NOT NULL AS has_insight, generated_at
FROM weekly_insights
WHERE user_id = 'USER_ID'
ORDER BY week_start DESC
LIMIT 5;

-- Weekly rows in personal_prompts (same user)
SELECT prompt_date, left(prompt_text, 80) AS preview
FROM personal_prompts
WHERE user_id = 'USER_ID' AND prompt_type = 'weekly'
ORDER BY prompt_date DESC
LIMIT 5;
```

## Manual trigger (for testing)

Call the cron route with your `CRON_SECRET`:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR_APP_URL/api/cron/generate-weekly-insights"
```

Response includes `weekStart`, `weekEnd`, `processed`, `succeeded`, `failed`.
