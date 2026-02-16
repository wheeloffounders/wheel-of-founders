# Environment Variables Setup Guide

This guide walks you through obtaining and configuring every environment variable for the Wheel of Founders project. Aim: **under 30 minutes** for a new developer.

---

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in values section by section below.
3. Run the validation script (optional):
   ```bash
   node scripts/validate-env.js
   ```
4. Start the app: `npm run dev`

---

## 1. Supabase (Required)

**Used for:** Auth, database, storage.

### Where to get them

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and open your project (or create one).
2. **Project Settings** (gear icon in sidebar) → **API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Important

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It bypasses Row Level Security.
- The anon key is safe to expose (it’s in `NEXT_PUBLIC_*` and used in the browser).

### Common issues

- **"Invalid API key"**: Ensure you copied the full key and didn’t add spaces or newlines.
- **"Auth session missing"**: Check that both URL and anon key match the project where users sign up.

---

## 2. Stripe (Required for payments)

**Used for:** Subscriptions, checkout, webhooks.

### Where to get them

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API keys**.
2. Copy:
   - **Secret key** (starts with `sk_test_` or `sk_live_`) → `STRIPE_SECRET_KEY`
3. **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://your-domain.com/api/stripe/webhook` (or `http://localhost:3000/api/stripe/webhook` for testing with Stripe CLI).
   - Events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`, etc. (see `app/api/stripe/webhook/route.ts` for the list).
   - Copy **Signing secret** (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET`
4. **Products** → create products/prices (or use existing) → copy each **Price ID** (starts with `price_`):
   - `STRIPE_PRO_MONTHLY_PRICE_ID`
   - `STRIPE_PRO_ANNUAL_PRICE_ID`
   - `STRIPE_PRO_PLUS_MONTHLY_PRICE_ID`
   - `STRIPE_PRO_PLUS_ANNUAL_PRICE_ID`

### Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Common issues

- **Webhook signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint (and use the CLI secret when using `stripe listen`).
- **Price not found**: Price IDs must be from the same Stripe account as the secret key.

---

## 3. MailerLite (Optional but recommended)

**Used for:** Marketing lists, new-signup sync, optional transactional (MailerSend).

### Where to get them

1. [MailerLite](https://www.mailerlite.com) → **Integrations** → **API**.
2. Create/generate an API key → `MAILERLITE_API_KEY`.
3. **Subscribers** → **Groups** → create or pick a group for new signups → copy **Group ID** from URL or group settings → `MAILERLITE_GROUP_ACTIVE`.
4. For transactional (welcome emails, etc.):
   - Either use [MailerSend](https://www.mailersend.com) (same ecosystem) and get an API key → `MAILERLITE_TRANSACTIONAL_API_KEY`,
   - Or use Resend (see below) and set `RESEND_API_KEY` instead.

### Common issues

- **401 Unauthorized**: API key may be revoked or from a different account.
- **Group not found**: Use the numeric group ID, not the group name.

---

## 4. Resend (Optional – transactional emails)

**Used for:** Transactional emails if you don’t use MailerSend.

1. [Resend](https://resend.com) → **API Keys** → create key.
2. Set `RESEND_API_KEY=re_...` in `.env.local`.
3. If both `MAILERLITE_TRANSACTIONAL_API_KEY` and `RESEND_API_KEY` are set, the app uses MailerSend first.

---

## 5. OpenRouter (Required for AI coaching)

**Used for:** Mrs. Deer AI prompts (OpenRouter aggregates multiple AI providers).

1. [OpenRouter](https://openrouter.ai) → **Keys** → create API key.
2. Set `OPENROUTER_API_KEY=sk-or-...`.
3. Set `NEXT_PUBLIC_SITE_URL` to your app URL (e.g. `http://localhost:3000` or production URL). OpenRouter may use this as referrer.
4. Optional: `OPENROUTER_MODEL` to force a model (e.g. `openai/gpt-4o-mini`).

### Common issues

- **403 / region**: Some models are restricted by region. The app has fallbacks (e.g. DeepSeek, Gemini); ensure `OPENROUTER_API_KEY` is valid.

---

## 6. OpenAI / Anthropic (Optional – analysis engine)

**Used for:** Pattern analysis in `lib/analysis-engine.ts`. Only one key is needed.

- **OpenAI**: [API Keys](https://platform.openai.com/api-keys) → `OPENAI_API_KEY=sk-...`
- **Anthropic**: [API Keys](https://console.anthropic.com/) → `ANTHROPIC_API_KEY=sk-ant-...`

If neither is set, analysis features that depend on them will be skipped or fall back to other behavior.

---

## 7. PostHog (Optional – analytics)

**Used for:** Product analytics and feature flags.

1. [PostHog](https://posthog.com) → create project → **Project Settings** → **Project API Key**.
2. Set `NEXT_PUBLIC_POSTHOG_KEY=phc_...`.
3. Set `NEXT_PUBLIC_POSTHOG_HOST` (e.g. `https://us.i.posthog.com` or your self-hosted URL).

---

## 8. App configuration

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Full app URL (no trailing slash). Used in emails and redirects. Local: `http://localhost:3000`. Production: `https://wheeloffounders.com`. |
| `CRON_SECRET` | Secret for protecting cron endpoints (e.g. refresh-cohort, analyze-patterns, daily-analytics, transactional send). Generate: `openssl rand -hex 32`. |
| `ADMIN_SECRET` | Optional. Bearer token for legacy admin API auth. |

---

## 9. E2E testing (Optional)

For Playwright tests that hit real auth:

- `E2E_TEST_EMAIL` – test user email
- `E2E_TEST_PASSWORD` – test user password
- `PLAYWRIGHT_BASE_URL` – e.g. `http://localhost:3000`

See `docs/E2E_TESTING.md` for details.

---

## Local vs production

| Topic | Local | Production |
|-------|--------|------------|
| **Supabase** | Same project or a separate “dev” project. | Use production project. |
| **Stripe** | Use test keys (`sk_test_`, `pk_test_`) and test webhook secret. | Use live keys and live webhook endpoint. |
| **URLs** | `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000`. | Your real domain. |
| **Webhooks** | Use Stripe CLI to forward to localhost; use the CLI’s `whsec_` as `STRIPE_WEBHOOK_SECRET`. | Real webhook URL and signing secret from Dashboard. |

---

## Rotating / updating keys

1. **Supabase**: Create a new anon or service_role key in Project Settings → API, update `.env.local`, redeploy. Revoke the old key after confirming the app works.
2. **Stripe**: Create a new secret key; update `STRIPE_SECRET_KEY`. For webhooks, add a new endpoint, get the new signing secret, then remove the old endpoint.
3. **CRON_SECRET**: Generate a new value with `openssl rand -hex 32`, update env everywhere (local + hosting), then restart cron jobs or redeploy.

---

## Testing checklist

After filling `.env.local`:

- [ ] `npm run dev` starts without env-related crashes.
- [ ] You can sign up / log in (Supabase).
- [ ] Dashboard and protected routes load (auth works).
- [ ] If Stripe is configured: pricing page loads; checkout redirects correctly (use test card `4242 4242 4242 4242`).
- [ ] If OpenRouter is configured: trigger an AI prompt (e.g. Mrs. Deer) and confirm no 403/500.
- [ ] Optional: run `node scripts/validate-env.js` and fix any reported missing or invalid variables.

---

## Reference: all variables

See `.env.example` for the full list with comments. Required for a minimal run:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (if you use payments)
- `OPENROUTER_API_KEY` (if you use AI)
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET` (if you use cron or transactional send)

Everything else is optional or has fallbacks.
