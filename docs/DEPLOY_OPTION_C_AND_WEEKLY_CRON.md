# Deploy: Option C (credits) + Weekly insight cron fixes

Both bundles are **already in the repo**. Deploy together with `vercel` (preview) then `vercel --prod`.

## What ships

### Option C — Vercel credit savings
- `vercel.json`: `retry-weekly-insights` → every **6 hours** (`0 */6 * * *`)
- `app/api/version/route.ts`: `revalidate = 3600` + `Cache-Control: public, s-maxage=3600, stale-while-revalidate=60`
- `lib/analytics-batch.ts` + `app/api/analytics/batch-page-views/route.ts`
- `PageViewTracker` → batch endpoint; `PostHogProvider` → no duplicate `/api/analytics/page-view`

### Weekly insight cron reliability
- `lib/cron-auth.ts` — trim `CRON_SECRET` + `Authorization` (fixes common **401** from whitespace)
- `app/api/cron/generate-weekly-insights` + `retry-weekly-insights` — logging + shared auth
- `app/api/cron/status` — health heuristics (Bearer `CRON_SECRET`)
- `app/weekly/page.tsx` — `sessionStorage` key per completed week (no refresh spam)
- `docs/WEEKLY_INSIGHTS_DIAGNOSTIC.md`

**Not included:** progressive unlock / Founder DNA timetable changes (unless merged separately).

---

## Steps

### 1. Preview
```bash
vercel
```
Verify on the preview URL:
- [ ] `GET /api/version` — response includes `Cache-Control` with `s-maxage=3600`
- [ ] DevTools Network — `batch-page-views` batches navigations (not every route)
- [ ] `GET /api/cron/status` with Bearer secret (see below)

### 2. Production
```bash
vercel --prod
```

### 3. Cron status (production)
```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/cron/status" | jq
```

**Actual JSON shape** (not the abbreviated example):

| Field | Meaning |
|--------|--------|
| `healthy` | Heuristic: recent `weekly_insights` activity |
| `weeklyCron.description` | e.g. Monday 00:00 UTC |
| `weeklyCron.scheduleCronUTC` | `0 0 * * 1` |
| `expectedLastCompletedWeekStart` | Last Monday (date string) |
| `rowsForThatWeekCount` | Rows in `weekly_insights` for that `week_start` (all users) |
| `latestWeeklyInsightRow` | `{ generated_at, week_start }` or `null` |
| `note` / `dashboardHint` | How to interpret + Vercel Crons UI |

Optional stale alert to Sentry: append `?notify=1` (use sparingly).

### 4. Vercel Dashboard
- **Settings → Cron Jobs** — next run / failures for `generate-weekly-insights` and `retry-weekly-insights`
- **Settings → Environment Variables** — `CRON_SECRET` has **no** leading/trailing spaces or newlines (`scripts/fix-cron-secret.sh`)

### 5. Credits
- **Usage** — function invocations should ease over 24–48h after prod deploy

---

## If cron still returns 401
1. Confirm `CRON_SECRET` in Vercel matches what you use in `curl` (trimmed).
2. Check **Cron** execution logs for 401 on `/api/cron/generate-weekly-insights`.
3. See `docs/WEEKLY_INSIGHTS_DIAGNOSTIC.md`.

## Timezone
Weekly generation schedule is **Monday 00:00 UTC** until you change `vercel.json`. For another local window, convert to UTC and update the cron expression.

---

## Typechecking (don’t pass file lists to `tsc`)

Run the **whole project** so `tsconfig.json` applies (`paths` for `@/…`, JSX, etc.):

```bash
npm run typecheck
# same as: npx tsc --noEmit
```

Avoid:

```bash
npx tsc --noEmit path/to/file.tsx   # wrong: ignores project paths → false “cannot find module @/…”
```

Full-project `tsc` may still report unrelated Supabase/`.next` issues; **Next.js `next build`** is the authoritative compile for deploy.
