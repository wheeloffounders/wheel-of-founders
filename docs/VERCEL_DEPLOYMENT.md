# Vercel Deployment Guide – Wheel of Founders

Step-by-step deployment to Vercel with the correct environment variables and follow-up configuration.

---

## Prerequisites

- Repo pushed to GitHub
- Production Supabase project (URL + anon key + service role key)
- Stripe account (live keys and price IDs for production)
- Production URL (e.g. `https://wheeloffounders.com` or `https://your-app.vercel.app`)

---

## Deploy from CLI (project already on Vercel)

If the project **wheel-of-founders-prod** already exists on Vercel but has no production deployment:

1. **Log in once** (opens browser):
   ```bash
   cd ~/Desktop/wheel-of-founders
   npx vercel login
   ```
2. **Link this repo to the Vercel project**:
   ```bash
   npx vercel link --yes --project wheel-of-founders-prod
   ```
   When prompted for scope, choose the team/account that owns **wheel-of-founders-prod**.
3. **Add env vars** in [Vercel → wheel-of-founders-prod → Settings → Environment Variables](https://vercel.com/vanies-projects-e1afa5d7/wheel-of-founders-prod/settings/environment-variables). See Step 2 below for the list. You can also add via CLI: `npx vercel env add VARIABLE_NAME` (prompts for value).
4. **Deploy to production**:
   ```bash
   npx vercel --prod
   ```
5. Note the **production URL** (e.g. `https://wheel-of-founders-prod.vercel.app`). Then do Step 4 (Stripe webhook) and Step 5 (Supabase URLs).

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

### 2.6 Push notifications (optional)

For web push notifications (morning/evening reminders, profile reminders):

| Variable | Notes |
|----------|--------|
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | From same command (keep secret) |
| `VAPID_SUBJECT` | e.g. `mailto:support@wheeloffounders.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` (client needs it) |

### 2.7 Optional (add if you use them)

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

## Troubleshooting: "Invalid API key" in Preview

If preview deployments fail with `Invalid API key - Double check your Supabase anon or service_role API key`:

1. **Verify env vars exist for Preview:**
   ```bash
   npx vercel env ls
   ```
   Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are listed for **Preview**.

2. **Re-add the Supabase keys** (values may be wrong or from a different project). **Recommended: use the Vercel dashboard** (works reliably):
   - Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**
   - Copy **Project URL**, **anon public** key, and **service_role** key
   - Go to [Vercel Dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**
   - For each of `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`:
     - Edit (or add) and ensure **Preview** is checked
     - Paste the value from `.env.local` or Supabase
   - Save

   **Alternative: CLI** (may prompt for branch; run interactively):
   ```bash
   npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY preview
   npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
   # Paste the anon key when prompted; choose "all branches" or specific branch

   npx vercel env rm NEXT_PUBLIC_SUPABASE_URL preview
   npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview

   npx vercel env rm SUPABASE_SERVICE_ROLE_KEY preview
   npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview
   ```

   **Optional script** (syncs from `.env.local`; may still require interactive input):
   ```bash
   ./scripts/fix-preview-supabase-env.sh
   ```

3. **Redeploy preview** so new env vars take effect:
   ```bash
   ./scripts/deploy-dev.sh
   ```
   Or push a new commit to trigger a preview deployment.

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
