# Production Deployment Checklist

Use this guide to deploy Wheel of Founders to production (Vercel + Supabase + Stripe).

**For a step-by-step Vercel deploy with env var order and Stripe/Supabase follow-up,** use **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** first.

---

## 1. Vercel deployment

### One-time setup

1. Push your repo to GitHub (if not already).
2. Go to [Vercel](https://vercel.com) → **Add New** → **Project**.
3. Import the repo; framework preset **Next.js** (auto-detected).
4. **Root directory:** leave as `.` unless the app lives in a subfolder.
5. Do **not** build yet — set environment variables first (see below).

### Environment variables in Vercel

In the project → **Settings** → **Environment Variables**, add every variable from `.env.example` that you use. Set them for **Production** (and optionally Preview).

**Required for production:**

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key (secret) |
| `STRIPE_SECRET_KEY` | Use **live** key (`sk_live_...`) in production |
| `STRIPE_WEBHOOK_SECRET` | From **production** webhook endpoint (see below) |
| `STRIPE_PRO_*_PRICE_ID` | Live price IDs from your Stripe products |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://wheeloffounders.com` |
| `CRON_SECRET` | Strong random string (e.g. `openssl rand -hex 32`) |
| `OPENROUTER_API_KEY` | For AI coaching |

**Optional but recommended:** MailerLite, Resend, PostHog, `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL` (set to same as `NEXT_PUBLIC_APP_URL`).

After adding variables, trigger a **Redeploy** so the build uses them.

---

## 2. Stripe webhook (production)

### Create production endpoint

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. **Add endpoint**.
3. **Endpoint URL:** `https://your-production-domain.com/api/stripe/webhook` (e.g. `https://wheeloffounders.com/api/stripe/webhook`).
4. **Events to send:** select:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Add endpoint**.
6. Open the new endpoint → **Reveal** signing secret. Copy the value (starts with `whsec_`).
7. In Vercel, set **Production** env var: `STRIPE_WEBHOOK_SECRET` = that signing secret.
8. Redeploy so the running app uses the new secret.

**Important:** The production webhook secret is **different** from the one you get with `stripe listen` locally. Never use the CLI secret in production.

### Test webhook locally (Stripe CLI)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Terminal will show a **webhook signing secret** (e.g. `whsec_...`). Put that in `.env.local` as `STRIPE_WEBHOOK_SECRET`, then run `npm run dev`. In another terminal:

```bash
stripe trigger checkout.session.completed
# or
stripe trigger customer.subscription.updated
```

Check your app logs and Stripe Dashboard → Webhooks → **Recent deliveries** for the forwarded event.

---

## 3. Supabase production

- Use a **production** Supabase project (or a dedicated project for prod). Do not use the same project URL as local if you want isolated data.
- **Project Settings** → **API:** use production URL and keys in Vercel env vars.
- **Authentication** → **URL Configuration:** set **Site URL** to your production URL (e.g. `https://wheeloffounders.com`). Add **Redirect URLs** if you use custom callback paths.
- **RLS:** Ensure RLS is enabled on all user-facing tables (`morning_tasks`, `evening_reviews`, `user_profiles`, etc.). Policies should restrict by `auth.uid()` or `user_id` so users cannot read or write other users’ data. Run through [Admin testing](ADMIN_TESTING.md) with a non-admin account to confirm isolation.

---

## 4. Custom domain (Vercel)

1. Vercel project → **Settings** → **Domains**.
2. Add your domain (e.g. `wheeloffounders.com` and `www.wheeloffounders.com`).
3. Follow Vercel’s DNS instructions (A/CNAME records at your registrar).
4. After DNS propagates, Vercel will provision SSL.
5. Update **Supabase** Site URL and **Stripe** webhook URL to use this domain. Update `NEXT_PUBLIC_APP_URL` (and `NEXT_PUBLIC_SITE_URL` if used) in Vercel to the final production URL.

---

## 5. Post-deployment testing

- [ ] **Health:** `GET https://your-domain.com/api/health` returns `200` and `"status":"ok"`.
- [ ] **Homepage** loads; sign-up and login work (Supabase auth).
- [ ] **Morning / Evening** flows save and load (DB + RLS).
- [ ] **Pricing / Checkout:** use Stripe test card `4242 4242 4242 4242` if still on test mode, or a real subscription in live mode. Complete checkout and confirm webhook runs (Stripe Dashboard → Webhooks → delivery success).
- [ ] **Subscription state** appears correctly in app (e.g. settings or dashboard) after webhook processing.
- [ ] **Admin:** log in as an admin user; `/admin`, `/admin/experiments`, `/admin/cross-user-analytics` load. Non-admin cannot access (see [Admin testing](ADMIN_TESTING.md)).
- [ ] **Cron / transactional:** if you use cron (e.g. refresh-cohort, daily-analytics) or transactional email, trigger once and confirm no errors (check Vercel logs and MailerLite/Resend).

---

## 6. Monitoring

- **Vercel:** **Deployments** and **Logs** for runtime errors.
- **Stripe:** **Developers** → **Webhooks** → delivery status and logs.
- **Supabase:** **Logs** for API and auth issues.
- **Health check:** Use `/api/health` in an uptime monitor (e.g. Vercel Monitoring, Better Uptime) to alert on non-200 or missing `"status":"ok"`.

---

## Quick reference

| Item | Production value |
|------|------------------|
| App URL | `https://wheeloffounders.com` (or your domain) |
| Stripe keys | Live keys (`sk_live_`, live price IDs) |
| Stripe webhook | `https://your-domain.com/api/stripe/webhook` + live signing secret |
| Supabase | Production project URL + keys |
| Health check | `GET /api/health` |
