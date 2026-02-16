# Wheel of Founders — Complete Project Status Report

**Generated:** February 2025  
**Purpose:** Comprehensive reference of all completed work, database schema, API routes, pending items, and next steps.

---

## 1. COMPLETED FEATURES (by category)

### Core Daily Flow

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Morning Page** | Power List (3 tasks), Decision Log (strategic/tactical), Action Plans (My Zone, Systemize, Delegate, Eliminate, Quick Win), Needle Mover/Initiative classification, planning mode (full/light) | `app/morning/page.tsx` | Working |
| **Emergency Page** | Log disruptions ("fires"), severity (hot/warm/contained), date selector, notes, mark resolved | `app/emergency/page.tsx` | Working |
| **Evening Page** | Mood/energy check-in, journal reflection, wins & lessons (multiple entries), celebration modal on completion | `app/evening/page.tsx` | Working |

### AI Coaching (Mrs. Deer)

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Mrs. Deer Persona** | Human-friendly AI coach; observe → reframe → question; no product jargon (Needle Mover, BALANCED_STAGE, etc.) | `lib/mrs-deer.ts` | Working |
| **Gentle Architect** | Pre-morning prompt (before plan created) | `lib/personal-coaching.ts` | Working |
| **Post-Morning Insight** | After plan saved; reviews tasks & decision | `lib/personal-coaching.ts` | Working |
| **Post-Evening Insight** | After evening review; reflects on wins/lessons | `lib/personal-coaching.ts` | Working |
| **AICoachPrompt** | Modal component for displaying AI insights | `components/AICoachPrompt.tsx` | Working |
| **MrsDeerAdaptivePrompt** | Context-aware prompts (evening) | `components/MrsDeerAdaptivePrompt.tsx` | Working |
| **MrsDeerFeedbackPrompt** | In-context feedback prompts | `components/MrsDeerFeedbackPrompt.tsx` | Working |

### Authentication & User Profiles

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Supabase Auth** | Google/Apple OAuth, session management | `lib/supabase.ts`, `lib/auth.ts` | Working |
| **Auth Callback** | Exchange code for session, create profile, MailerLite sync, auto-grant admin for founder | `app/auth/callback/route.ts` | Working |
| **User Profiles** | Tier, pro_features_enabled, streaks, email prefs, timezone, founder profile (goal, stage, role, struggles, hobbies, destress, message to Mrs. Deer) | `app/profile/page.tsx`, `supabase/migrations/010`, `024`, `026`, etc. | Working |
| **Admin Access** | `is_admin`, `admin_role` on user_profiles; layout protects `/admin` | `supabase/migrations/033`, `app/admin/layout.tsx`, `lib/auth.ts` | Working |

### Dashboard & Analytics

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Main Dashboard** | Today's plan summary, quick links, streak display | `app/page.tsx` | Working |
| **Admin Analytics** | Tabbed dashboard: Overview, Funnels, Retention, Journeys, Real-time, Experiments | `app/admin/analytics/page.tsx` | Working |
| **Cross-User Analytics** | Patterns, feature usage, cohort data | `app/admin/cross-user-analytics/page.tsx` | Working |
| **PostHog** | Client-side analytics (events, page views, identify) | `lib/analytics.ts`, `components/PostHogProvider.tsx` | Working |
| **Feature Usage API** | Server-side tracking to `feature_usage` table | `app/api/analytics/feature-usage/route.ts` | Working |

### History / Journey

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **History Page** | View past plans, reviews, emergencies; date selector; feature-gated by tier | `app/history/page.tsx`, `components/HistoryAccessGate.tsx` | Working |
| **Weekly Page** | Weekly summary, focus score trends | `app/weekly/page.tsx` | Working |

### Monetization (Pricing, Stripe, Tiers)

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Pricing Page** | Tier comparison (Free, Pro, Pro+) | `app/pricing/page.tsx` | Working |
| **Stripe Checkout** | Create checkout session | `app/api/stripe/create-checkout/route.ts` | Working |
| **Stripe Webhook** | Handle subscription events, update user_profiles | `app/api/stripe/webhook/route.ts` | Working |
| **Cancel / Reactivate** | Subscription management | `app/api/stripe/cancel-subscription`, `reactivate-subscription` | Working |
| **Subscription Settings** | User-facing subscription page | `app/settings/subscription/page.tsx` | Working |
| **Feature Tiers** | `getFeatureAccess()` drives feature visibility | `lib/features.ts` | Working (beta = full access) |

### Settings & Misc

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Settings Page** | Email, weekly summary toggle, community insights toggle, goal, export options | `app/settings/page.tsx` | Working |
| **Timezone Settings** | Manual timezone override | `app/settings/timezone/page.tsx` | Working |
| **Video Templates** | Video template library (Pro+) | `app/video-templates/page.tsx` | Working |
| **Onboarding Wizard** | First-time setup flow | `components/OnboardingWizard.tsx` | Working |
| **Date Selector** | Date picker for morning/evening/emergency/history | `components/DateSelector.tsx` | Working |

### Mobile Experience

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Responsive Layout** | Tailwind responsive classes, mobile-first | Global | Working |
| **Mobile Sidebar** | Hamburger menu, full nav on mobile | `components/MobileSidebar.tsx` | Working |
| **Theme Toggle** | Light/dark mode, persisted | `components/Navigation.tsx` | Working |
| **PWA / Install Prompt** | Add-to-home-screen prompt | `components/InstallPrompt.tsx`, `ServiceWorkerRegister.tsx` | Working |
| **Speech-to-Text Input** | Voice input on textareas/inputs (Web Speech API) | `components/SpeechToTextInput.tsx` | Working |

### Admin & Cross-User Analytics

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Admin Layout** | Protects `/admin`; requires `is_admin` | `app/admin/layout.tsx` | Working |
| **Analytics Dashboard** | Overview, Funnels, Retention, Journeys, Real-time, Experiments | `app/admin/analytics/page.tsx` | Working |
| **Cross-User Analytics** | Patterns, usage, cohorts | `app/admin/cross-user-analytics/page.tsx` | Working |
| **Funnel Analysis** | Step conversion, drop-off | `lib/analytics/funnels.ts`, `app/api/admin/funnels` | Working |
| **Cohort Retention** | Week 0–4 retention from materialized view | `app/api/admin/cohorts`, `supabase/migrations/035` | Working |
| **Journey Mapping** | Page paths, drop-off points | `lib/analytics/journeys.ts`, `app/api/admin/journeys` | Working |
| **Real-time** | Live users (5 min), recent activity, today stats | `app/api/admin/realtime/route.ts` | Working |
| **A/B Experiments** | Experiment list, variant assignments, events | `lib/analytics/experiments.ts`, `app/api/admin/experiments` | Working |
| **Cron: Daily Analytics** | Populate daily_stats, run pattern extraction | `app/api/cron/daily-analytics/route.ts`, `vercel.json` | Working |
| **Cron: Analyze Patterns** | Hourly pattern analysis | `app/api/cron/analyze-patterns/route.ts`, `vercel.json` | Working |

### Feedback Systems

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Feedback Form** | Long-form: whats working, confusing, features, NPS, other | `app/feedback/page.tsx`, `app/api/feedback/route.ts` | Working |
| **Feedback Triggers** | 7 days active, 7 evening reviews, first export, 30 days | `lib/feedback-triggers.ts`, `app/api/feedback/check-triggers`, `trigger-status`, `trigger-preferences` | Working |
| **FeedbackPopUp** | In-app feedback prompt | `components/FeedbackPopUp.tsx` | Working |
| **Pattern Shown Tracking** | Record when patterns are shown | `app/api/feedback/record-pattern-shown/route.ts` | Working |

### Pattern Detection

| Feature | What it does | Key files | Status |
|--------|---------------|-----------|--------|
| **Pattern Extractor** | AI-extract struggles/wins from reflections | `lib/analytics/pattern-extractor.ts` | Working |
| **Enqueue Patterns** | Add content to pattern_extraction_queue | `app/api/analytics/enqueue-patterns/route.ts` | Working |
| **Detect Patterns API** | Server-side pattern detection for feedback | `app/api/feedback/detect-patterns/route.ts` | Working |
| **user_patterns Table** | Store extracted patterns | `supabase/migrations/032` | Working |

### Integrations

| Integration | What it does | Key files | Status |
|-------------|--------------|-----------|--------|
| **Supabase** | Auth, DB, RLS, storage (exports bucket) | `lib/supabase.ts`, `lib/server-supabase.ts` | Working |
| **OpenRouter** | AI for Mrs. Deer, pattern extraction; region fallbacks | `lib/ai-client.ts` | Working |
| **MailerLite** | Subscribe new users, automations | `lib/mailerlite.ts`, `app/auth/callback/route.ts` | Working (optional: MAILERLITE_API_KEY) |
| **PostHog** | Product analytics | `lib/analytics.ts`, `PostHogProvider.tsx` | Working (optional: NEXT_PUBLIC_POSTHOG_KEY) |
| **Stripe** | Payments, subscriptions | `app/api/stripe/*` | Working |
| **Resend** | Not referenced in current codebase | — | Not integrated |

---

## 2. DATABASE SCHEMA SUMMARY

### Tables (by migration)

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| **morning_tasks** | Power List tasks; user_id, plan_date, description, why_this_matters, action_plan, needle_mover, is_proactive | auth.users, morning_decisions (same user/date) |
| **morning_decisions** | Decision Log; user_id, plan_date, decision, decision_type, why_this_decision | auth.users |
| **evening_reviews** | Journal, mood, energy, wins, lessons; user_id, review_date | auth.users |
| **emergencies** | Disruptions; user_id, fire_date, description, severity, notes, resolved | auth.users |
| **user_profiles** | Streaks, email prefs, tier, Stripe IDs, founder profile (goals, stage, role, struggles, hobbies), is_admin, admin_role | auth.users |
| **personal_prompts** | Stored AI prompts (Gentle Architect, post-morning, post-evening, etc.) | user_profiles |
| **user_insights** | Stored insights | user_profiles |
| **analysis_logs** | AI analysis audit | — |
| **community_insights** | Community-level insights | — |
| **personal_insights** | Personal insight cache | user_profiles |
| **data_exports** | Export jobs; file_url, status, date_range | auth.users |
| **feedback** | User feedback (bug, long_form, popup, mrs_deer) | auth.users |
| **feedback_trigger_preferences** | Dismissed triggers, maybe_later_until | auth.users |
| **user_patterns** | Extracted struggles/wins | auth.users |
| **feature_usage** | Feature actions (morning_save, evening_save, etc.) | auth.users |
| **user_cohorts** | Aggregated retention by cohort_date | — |
| **daily_stats** | Aggregated daily metrics | — |
| **pattern_extraction_queue** | Batch pattern extraction | auth.users |
| **funnel_events** | Funnel step completions | auth.users |
| **user_sessions** | Session boundaries, page_sequence | auth.users |
| **page_views** | Individual page views | auth.users, user_sessions |
| **experiments** | A/B experiment config | — |
| **experiment_assignments** | User → variant | auth.users, experiments |
| **experiment_events** | Events per variant | auth.users, experiments |

### Materialized View

| View | Purpose |
|------|---------|
| **cohort_retention** | Week 0–4 retention from user_profiles + evening_reviews + morning_tasks |

### RLS Policies (Summary)

- **User data (morning_tasks, evening_reviews, emergencies, user_profiles, feedback, etc.):** User-scoped (`auth.uid() = user_id`) or service_role.
- **Analytics (user_patterns, feature_usage, daily_stats, funnel_events, page_views, experiments, etc.):** Service role only.
- **data_exports:** User can SELECT own; service_role can manage.
- **feedback:** User INSERT own; service_role SELECT all.

---

## 3. API ROUTES

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/callback` | GET | OAuth | Exchange code, create profile, MailerLite sync |
| `/api/admin/analytics` | GET | Admin | Daily stats, top patterns |
| `/api/admin/cross-user-analytics` | GET | Admin | Cross-user analytics |
| `/api/admin/funnels` | GET | Admin | Funnel analysis |
| `/api/admin/cohorts` | GET | Admin | Cohort retention |
| `/api/admin/journeys` | GET | Admin | Journey paths, drop-offs |
| `/api/admin/realtime` | GET | Admin | Live users, recent activity |
| `/api/admin/experiments` | GET | Admin | A/B experiment results |
| `/api/admin/pattern-analytics` | GET | Admin | Pattern analytics |
| `/api/analytics/feature-usage` | POST | Session | Record feature usage |
| `/api/analytics/page-view` | POST | Session | Record page view |
| `/api/analytics/enqueue-patterns` | POST | Session | Enqueue pattern extraction |
| `/api/analytics/funnel` | POST | Session | Record funnel step |
| `/api/personal-coaching` | POST | Session | Generate Mrs. Deer insights |
| `/api/profile-insight` | POST | Session | Profile reflection insight |
| `/api/user-preferences` | GET/POST | Session | User preferences |
| `/api/feedback` | POST | Session | Submit feedback |
| `/api/feedback/check-triggers` | GET | Session | Check feedback triggers |
| `/api/feedback/trigger-status` | GET | Session | Trigger status |
| `/api/feedback/trigger-preferences` | GET/POST | Session | Dismiss/maybe-later |
| `/api/feedback/detect-patterns` | POST | Session | Detect patterns in text |
| `/api/feedback/record-pattern-shown` | POST | Session | Record pattern shown |
| `/api/stripe/create-checkout` | POST | Session | Create Stripe checkout |
| `/api/stripe/webhook` | POST | Stripe sig | Handle Stripe events |
| `/api/stripe/cancel-subscription` | POST | Session | Cancel subscription |
| `/api/stripe/reactivate-subscription` | POST | Session | Reactivate subscription |
| `/api/export` | POST | Session | Create export job |
| `/api/export/[exportId]/download` | GET | Session | Download export |
| `/api/cron/daily-analytics` | GET | CRON_SECRET | Daily analytics cron |
| `/api/cron/analyze-patterns` | GET | CRON_SECRET | Hourly pattern cron |
| `/api/analyze-manual` | POST | Session | Manual analysis (debug) |

---

## 4. PENDING ITEMS

### Not Yet Complete

1. **Export CSV/PDF** — Export API creates jobs; download may need file generation/verification.
2. **Funnel Event Recording** — Funnel steps require `recordFunnelStep` calls; not all flows may be instrumented.
3. **Page View Recording** — `recordPageView` exists; client must POST to `/api/analytics/page-view` on navigation.
4. **Cohort Retention Refresh** — Materialized view `cohort_retention` must be refreshed (e.g., in daily cron or separate job).
5. **A/B Experiment Creation UI** — Experiments can be created in DB; no admin UI to create/start/stop experiments.
6. **Resend Integration** — Resend not used; MailerLite handles email for now.

### Known Issues / Polish

1. **Admin Analytics API** — Pattern query typing fixed with cast; may need schema alignment.
2. **Build** — May fail on font fetch in sandbox; full build with network works.
3. **Speech-to-Text** — Web Speech API not supported in Firefox; component gracefully hides mic.
4. **RLS on morning_tasks / evening_reviews / emergencies** — Some policies use `USING (true)`; consider tightening to `auth.uid() = user_id` for production.

### Needs Testing

- [ ] Full Stripe flow (checkout → webhook → subscription status)
- [ ] Export flow end-to-end
- [ ] Cron jobs with CRON_SECRET
- [ ] Admin analytics with real data
- [ ] Speech-to-Text in Chrome/Safari
- [ ] Mobile sidebar and responsive layout
- [ ] Feedback trigger timing and dismissal

---

## 5. NEXT STEPS RECOMMENDATIONS

| Priority | Item | Effort | Dependencies |
|----------|------|--------|--------------|
| P1 | Add `REFRESH MATERIALIZED VIEW cohort_retention` to daily cron | Small | CRON_SECRET, daily cron |
| P1 | Instrument page views on route change (e.g., layout or provider) | Small | `/api/analytics/page-view` |
| P1 | Instrument funnel steps (morning: plan_start → tasks_added → plan_saved; evening: review_start → review_saved) | Medium | `recordFunnelStep`, `/api/analytics/funnel` |
| P2 | Admin UI to create/edit A/B experiments | Medium | experiments table |
| P2 | Harden RLS on morning/evening/emergencies for production | Small | Auth |
| P2 | Verify export download flow (generate file, store, serve) | Medium | Supabase storage, data_exports |
| P3 | Add Resend for transactional emails (if needed) | Medium | Resend API |
| P3 | Implement Export button handlers (CSV/PDF) | Medium | Export API |
| P3 | E2E tests for critical flows | Large | Playwright/Cypress |

---

## Environment Variables Reference

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase (bypass RLS) |
| `OPENROUTER_API_KEY` | AI (Mrs. Deer, pattern extraction) |
| `OPENROUTER_MODEL` | Override default AI model |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `STRIPE_PRICE_*` | Price IDs for tiers |
| `CRON_SECRET` | Protect cron endpoints |
| `MAILERLITE_API_KEY` | MailerLite (optional) |
| `MAILERLITE_GROUP_ACTIVE` | Group ID for active users |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host |
