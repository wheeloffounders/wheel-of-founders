# WHEEL OF FOUNDERS - MASTER CONTEXT v3

## 🎯 CURRENT STATUS (Feb 4, 2026)
- **Project:** Next.js 16 + Supabase + Tailwind
- **Location:** `~/Desktop/wheel-of-founders`
- **Running:** `localhost:3000` (via `npm run dev -p 3000`)
- **Built:** ✅ Dashboard, ✅ Morning Plan, ✅ Emergency, ✅ Evening Review, ✅ Weekly Insights, ✅ History, ✅ Login/Auth
- **Colors:** Navy (#152b50), Coral (#ef725c), Emerald for completion states
- **Brand:** Mrs. Deer tone—supportive, warm, gentle (per business brief)

## 1. MY CURRENT FOCUS
Polishing UX and ensuring all core flows work end-to-end. Recent work: info tooltips on stat boxes, History page for backtracking, Mrs. Deer tone on Evening page.

## 2. KEY DECISIONS MADE
- **Auth:** Client-side only; `getUserSession()` from `lib/auth.ts`; redirect to `/login` if unauthenticated
- **Supabase:** Single client in `lib/supabase.ts`; use `select('*')` for resilience when schema may differ
- **Schema:** `morning_tasks` uses `action_plan` (Option 2: my_zone, systemize, delegate_founder, eliminate_founder, quick_win_founder); `completed` column added for Evening task checkoff
- **RLS:** Tables use `user_id` filter; policies must allow `auth.uid() = user_id` for authenticated access
- **Port:** Explicit `-p 3000` in dev script

## 3. PROGRESS SINCE LAST UPDATE
- **Dashboard:** Founder's Lens title; Needle Movers, Founder Action Mix, Estimated Time Saved, Focus Score, Fires Fought; info tooltips (?)
- **Evening:** "Today's Journey: What You Accomplished"; circular completion UX; celebratory tone; Mountain icon
- **History page:** Date navigator; view tasks, decisions, evening reflection, emergencies by day
- **InfoTooltip component:** Reusable ? icon with hover explanations on Dashboard and Weekly
- **Navigation:** History link added
- **Quick Actions:** History button on Dashboard

## 4. NEXT STEPS
1. AI Batch Processor / pattern analysis (2 AM job)
2. Pro tier features (Coach-in-the-Box, AI insights)
3. Mrs. Deer asset library and 5-min video templates
4. Reddit validation post for pre-launch

## 5. BLOCKERS / QUESTIONS
- None currently. Supabase 400 errors resolved via `select('*')` and RLS verification.

---

## 🗄️ DATABASE (Supabase)
- **URL:** `https://bqoovqkbntcynqhhmwwy.supabase.co`
- **Tables:** `morning_tasks`, `morning_decisions`, `evening_reviews`, `emergencies`
- **Migrations:** 001–009 in `supabase/migrations/`
- **.env.local:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📋 PAGES
| Page       | Path       | Status |
|-----------|------------|--------|
| Dashboard | `/`        | ✅     |
| Morning   | `/morning` | ✅     |
| Emergency | `/emergency` | ✅   |
| Evening   | `/evening` | ✅     |
| Weekly    | `/weekly`  | ✅     |
| History   | `/history` | ✅     |
| Login     | `/login`   | ✅     |

## ⚠️ KNOWN ISSUES / RESOLUTIONS
1. **400 on morning_tasks:** Use `select('*')`; verify RLS allows `auth.uid() = user_id`
2. **completed column missing:** Run `ALTER TABLE morning_tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;`
3. **Terminal:** `cd ~/Desktop/wheel-of-founders` (note: wheel-of-founders, not wheel-founders)

## 🔄 WORKFLOW
1. `cd ~/Desktop/wheel-of-founders`
2. `npm run dev` → `localhost:3000`
3. Check `PROJECT_CONTEXT.md` for context
