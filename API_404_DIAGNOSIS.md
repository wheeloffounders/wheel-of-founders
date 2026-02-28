# API Routes 404 Diagnosis Report

**Date:** Feb 20, 2025  
**Context:** All API routes return 404 in production except `/api/health`. Local build works.

---

## 1. Build Output Analysis

### Local build: SUCCESS
- **Next.js:** 16.1.6 (Turbopack)
- **All API routes are built** – no errors about `app/api` routes

```
Route (app)
├ ƒ /api/health
├ ƒ /api/debug
├ ƒ /api/test-ai
├ ƒ /api/test2
... (40+ API routes total)
```

All routes show `ƒ` (dynamic/server-rendered). No build-time exclusion.

### Pages Router coexistence
- `pages/api/ping.js` exists → `/api/ping` (Pages Router)
- App Router routes (`app/api/*`) take precedence for overlapping paths
- No path overlap between `/api/health`, `/api/debug`, `/api/test-ai` and `/api/ping`

---

## 2. Configuration Check

### vercel.json
```json
{"crons":[...]}
```
- No rewrites, redirects, or headers that would affect API routes
- Crons reference `/api/cron/*` – those routes exist in build

### next.config.ts
- Single redirect: `/admin/analytics/cross-user` → `/admin/cross-user-analytics`
- No API-related overrides
- No `output: 'standalone'` or other deployment tweaks

### Proxy (Next.js 16 middleware)
- `proxy.ts` at root – runs on all routes except static assets
- Matcher: `/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`
- Behavior: Refreshes Supabase session, sets `x-pathname`, returns `NextResponse.next()`
- Does not block or rewrite API routes

---

## 3. Working vs Broken Routes

| Route        | Location                    | Structure              | Status (prod) |
|-------------|-----------------------------|------------------------|---------------|
| `/api/health` | `app/api/health/route.ts`  | GET, dynamic, revalidate | Works         |
| `/api/debug`  | `app/api/debug/route.ts`  | GET, dynamic, revalidate | 404           |
| `/api/test-ai`| `app/api/test-ai/route.ts`| GET, dynamic, revalidate | 404           |

**Differences:**
- **health:** Imports `getServerSupabase` dynamically, does a DB check
- **debug:** Returns `{ status: 'ok' }` – minimal
- **test-ai:** Fetches OpenRouter (external HTTP)

All three use the same pattern: `export const dynamic = 'force-dynamic'`, `export const revalidate = 0`, `export async function GET()`.

---

## 4. Known Issues (from research)

### Next.js 15/16 + Vercel
- [Vercel Community](https://community.vercel.com/t/all-next-js-15-app-router-dynamic-api-routes-return-404-on-vercel/28544): Reports of App Router dynamic API routes returning 404 on Vercel
- [Stack Overflow](https://stackoverflow.com/questions/79637669/dynamic-api-routes-not-working-with-vercel-deployment): Similar 404s; one fix was **removing a duplicate `api` directory** at project root

### Duplicate `api` directories
- This project has:
  - `app/api/` – App Router API routes (correct)
  - `pages/api/` – Pages Router (`ping.js` only)
  - `api-archived-stripe/` – Archived Stripe routes (not under `app/`)

- `api-archived-stripe/` is at the root and is **not** under `app/`. Next.js does not treat it as routes. It should not cause routing conflicts, but worth noting.

---

## 5. Most Likely Causes

### A. Deployment not using latest code (HIGH)
- If Git push fails (e.g. auth), Vercel keeps deploying an older commit
- Older build might have fewer routes or different structure
- **Check:** Vercel deployment logs – which commit is deployed? Compare to local `git log -1`

### B. Vercel build cache (MEDIUM)
- Stale cache can produce inconsistent route registration
- **Check:** Vercel project → Settings → General → "Build Cache" – try "Clear Build Cache" and redeploy

### C. Next.js 16 + Vercel compatibility (MEDIUM)
- Next.js 16.1.6 is very new; Turbopack builds may behave differently on Vercel
- **Check:** Vercel build logs for Turbopack/Next.js warnings or errors

### D. Serverless function deployment (LOW)
- Some functions might fail to deploy (size, timeout, cold start) without clear errors
- 404 usually means the route is not registered, not that the function crashed

---

## 6. Diagnostic Steps to Run

### Step 1: Confirm deployed commit
```bash
# Local latest commit
git log -1 --oneline

# Compare with Vercel: Deployments → latest → "Source" / commit SHA
```

### Step 2: Clear Vercel build cache
Vercel Dashboard → Project → Settings → General → Build & Development Settings → "Clear Build Cache" → Redeploy

### Step 3: Minimal test endpoint
Create `app/api/ping-app/route.ts`:
```ts
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET() {
  return NextResponse.json({ ok: true, source: 'app-router' })
}
```
Deploy and test `GET /api/ping-app`. If it 404s, the problem is App Router API routes in general.

### Step 4: Compare Pages vs App
- `GET /api/ping` (Pages Router) – does it work in production?
- If Pages works but App does not, this points to an App Router–specific issue on Vercel.

### Step 5: Inspect Vercel Functions tab
After deploy: Vercel → Project → Deployments → latest → "Functions".  
Check whether `/api/health`, `/api/debug`, `/api/test-ai` are listed. If some are missing, those routes are not being deployed.

---

## 7. Summary

| Question | Answer |
|----------|--------|
| Are API routes built? | Yes – all 40+ routes appear in local build output |
| Config issues? | No – vercel.json and next.config.ts look fine |
| Proxy blocking? | No – proxy passes through with `NextResponse.next()` |
| Why health works but others 404? | Unclear from code – structure is identical |
| Next.js bug? | Possible – similar 404s reported for Next.js 15/16 on Vercel |
| Vercel issue? | Possible – cache or deployment pipeline |
| Config problem? | Unlikely – config is minimal |

**Recommended next step:** Run Step 1 (confirm deployed commit) and Step 5 (Functions tab). If the deployed commit matches local and all three routes appear in Functions, the problem is likely runtime. If the commit is old or routes are missing, the problem is deployment/cache.
