# Vercel Deployment Guide – Wheel of Founders

Step-by-step deployment to Vercel with the correct environment variables and follow-up configuration.

---

## Prerequisites

- Repo pushed to GitHub
- Production Supabase project (URL + anon key + service role key)
- Stripe account (live keys and price IDs for production)
- Production URL (e.g. `https://wheeloffounders.com` or `https://your-app.vercel.app`)

---

## Step 1: Create Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your GitHub repo (e.g. `wheel-of-founders`).
3. **Framework Preset:** Next.js (auto-detected).
4. **Root Directory:** `.`
5. Leave **Build and Output Settings** as default.
6. Do **not** click Deploy yet — add environment variables first.

---

## Step 2: Add environment variables (exact order)

In **Settings** → **Environment Variables**, add these for **Production** (and **Preview** if you want). Order below matches dependency groups; you can add in this order.

### 2.1 Supabase (required)

| Variable | Value | Where to get it |
|----------|--------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase → Project Settings → API → service_role (secret) |

### 2.2 App URL (required)

Set this to your **final** production URL (no trailing slash). If you don’t have a custom domain yet, use the Vercel URL (e.g. `https://wheel-of-founders.vercel.app`). You can change it later.

| Variable | Example |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://wheeloffounders.com` |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXT_PUBLIC_APP_URL` |

### 2.3 Stripe (required for payments)

| Variable | Value | Where to get it |
|----------|--------|------------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → Developers → API keys → Secret key (live) |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | `price_...` | Stripe → Products → your Pro product → monthly price ID |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | `price_...` | Same product → annual price ID |
| `STRIPE_PRO_PLUS_MONTHLY_PRICE_ID` | `price_...` | Pro+ product → monthly price ID |
| `STRIPE_PRO_PLUS_ANNUAL_PRICE_ID` | `price_...` | Pro+ product → annual price ID |

**Do not set `STRIPE_WEBHOOK_SECRET` yet.** You’ll set it in Step 4 after the first deploy and creating the production webhook.

### 2.4 Cron secret (required if you use cron)

| Variable | Example |
|----------|--------|
| `CRON_SECRET` | Output of `openssl rand -hex 32` |

### 2.5 OpenRouter (required for AI)

| Variable | Value |
|----------|--------|
| `OPENROUTER_API_KEY` | `sk-or-...` from OpenRouter dashboard |

### 2.6 Optional (add if you use them)

| Variable | Notes |
|----------|--------|
| `MAILERLITE_API_KEY` | MailerLite API key |
| `MAILERLITE_GROUP_ACTIVE` | Group ID for new signups |
| `MAILERLITE_TRANSACTIONAL_API_KEY` | Or use `RESEND_API_KEY` |
| `RESEND_API_KEY` | If not using MailerSend/MailerLite transactional |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | e.g. `https://us.i.posthog.com` |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | For analysis engine |
| `ADMIN_SECRET` | Optional Bearer token for admin API |

Save all variables, then deploy.

---

## Step 3: Deploy

1. Click **Deploy** (or trigger a new deployment from the **Deployments** tab).
2. Wait for the build to finish and note the **production URL** (e.g. `https://wheel-of-founders.vercel.app` or your custom domain).

---

## Step 4: Get production Stripe webhook secret

1. Open [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:**  
   `https://<your-production-domain>/api/stripe/webhook`  
   Examples:
   - `https://wheel-of-founders.vercel.app/api/stripe/webhook`
   - `https://wheeloffounders.com/api/stripe/webhook`
4. **Events to send:** click **Select events** and add:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**.
6. Open the new endpoint → **Reveal** signing secret. Copy the value (starts with `whsec_`).
7. In Vercel: **Settings** → **Environment Variables** → add:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: the copied `whsec_...`
   - Environment: Production (and Preview if you test webhooks there).
8. **Redeploy** the production deployment so the new secret is used.

---

## Step 5: Update Supabase URLs after deploy

1. Supabase Dashboard → your **production** project → **Authentication** → **URL Configuration**.
2. **Site URL:** set to your production app URL (e.g. `https://wheeloffounders.com` or your Vercel URL). No trailing slash.
3. **Redirect URLs:** add:
   - `https://<your-production-domain>/auth/callback`
   - `https://<your-production-domain>/**`
   (Replace with your real domain or Vercel URL.)
4. Save.

If you had deployed before setting the correct URL in Vercel, update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` in Vercel to match the URL you set in Supabase, then redeploy.

---

## Step 6: Verify deployment

Run the verification script against your production URL:

```bash
VERCEL_URL=https://wheeloffounders.com node scripts/verify-production.js
```

Or, if you use the default Vercel domain:

```bash
VERCEL_URL=https://wheel-of-founders.vercel.app node scripts/verify-production.js
```

See [scripts/verify-production.js](../scripts/verify-production.js) for what it checks. Fix any failing checks, then update the README live URL and run the script again.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create Vercel project, do not deploy yet |
| 2 | Add all env vars (Supabase → App URL → Stripe keys + prices → CRON_SECRET → OpenRouter → optional) |
| 3 | Deploy and note production URL |
| 4 | Create Stripe production webhook, add `STRIPE_WEBHOOK_SECRET`, redeploy |
| 5 | Set Supabase Site URL and Redirect URLs to production URL |
| 6 | Run `VERCEL_URL=<url> node scripts/verify-production.js` and update README live URL |
