# Environment Variables Setup Guide

This guide covers how to manage environment variables across Vercel environments so you never hit "Invalid API key" or missing config again.

## Quick Start

**Sync all environments at once:**

```bash
./scripts/sync-env-to-vercel.sh
```

This reads `.env.local` and syncs the key variables to Production, Preview, and Development on Vercel.

---

## Vercel Environments Explained

| Environment | When it's used | Branch |
|-------------|----------------|--------|
| **Production** | Live site (`vercel --prod`) | Your default branch (usually `main`) |
| **Preview** | PR deployments, non-prod branches | All preview branches |
| **Development** | Local dev with `vercel dev` | N/A |

**Critical:** Production and Preview are separate. If you add a variable only to Production, Preview deployments will fail. Always sync both.

---

## Sync Script: `scripts/sync-env-to-vercel.sh`

### What it syncs

- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `OPENROUTER_API_KEY` (optional)
- `CRON_SECRET` (optional)

### When to run it

1. **First-time setup** – After creating a new Vercel project
2. **New environment** – When adding Production or Preview for the first time
3. **After rotating keys** – When you regenerate Supabase or OpenRouter keys
4. **Before deploy** – If `./scripts/deploy-prod.sh` warns about missing vars

### Prerequisites

- `.env.local` exists with the required variables
- Vercel CLI: `npm i -g vercel` or use `npx vercel`
- Logged in: `npx vercel login`
- Project linked: `npx vercel link` (if not already)

---

## Adding Variables Manually

If you need to add a variable the sync script doesn't cover:

```bash
# Production (specify your default branch)
echo "your-value" | npx vercel env add MY_VAR production main

# Preview (applies to all preview deployments)
echo "your-value" | npx vercel env add MY_VAR preview

# Development (for vercel dev)
echo "your-value" | npx vercel env add MY_VAR development
```

Or use the [Vercel Dashboard](https://vercel.com) → Project → Settings → Environment Variables.

---

## Rotating Keys Safely

When you need to rotate Supabase or other API keys:

1. **Generate new key** in Supabase Dashboard (or other provider)
2. **Update `.env.local`** with the new value
3. **Run sync script:**
   ```bash
   ./scripts/sync-env-to-vercel.sh
   ```
4. **Redeploy** so running instances pick up the new vars:
   ```bash
   ./scripts/deploy-prod.sh
   ```

**Note:** Old deployments keep the old env vars until redeployed. Rotate during low-traffic periods if possible.

---

## Troubleshooting

### "Invalid API key" in Production or Preview

1. Run `./scripts/sync-env-to-vercel.sh` to sync from `.env.local`
2. Verify in Vercel Dashboard: Settings → Environment Variables
3. Ensure **Production** and **Preview** both have the vars (check the environment checkboxes)
4. Redeploy: `./scripts/deploy-prod.sh` or push a new commit for Preview

### deploy-prod.sh warns "Production environment variables may be missing"

Run the sync script first:

```bash
./scripts/sync-env-to-vercel.sh
```

Then run deploy again.

### CRON_SECRET contains leading or trailing whitespace

Vercel rejects env vars with whitespace in HTTP header values. If you see:

```
Error: The `CRON_SECRET` environment variable contains leading or trailing whitespace
```

**Root cause:** The scripts previously used `echo "$value"` when piping to Vercel. `echo` adds a trailing newline, which was being stored as part of the value. The fix uses `printf '%s'` instead (no newline).

1. **Diagnose** (optional) – See what's in Vercel and .env.local:
   ```bash
   ./scripts/diagnose-cron-secret.sh
   ```

2. **Immediate fix** – Run the one-time cleanup script (uses printf, no newline):
   ```bash
   ./scripts/fix-cron-secret.sh
   ```
   Verify: `npx vercel env ls | grep CRON_SECRET -A2`

3. **Redeploy** – The fix only takes effect after a new deployment:
   ```bash
   ./scripts/deploy-prod.sh
   ```

4. **Clean up `.env.local`** – Ensure no spaces or quotes around the value:
   ```bash
   # Good
   CRON_SECRET=3c90a302f345d792d125b887ccacb7a1

   # Bad (has trailing space or quotes)
   CRON_SECRET="3c90a302f345d792d125b887ccacb7a1 "
   ```

5. **Future syncs** – The sync script now uses `printf` (no newline) and trims all values.

### Where do I get the values?

See [DEPLOYMENT_ENV_VARS.md](./DEPLOYMENT_ENV_VARS.md) for where to find each variable (Supabase, Stripe, OpenRouter, etc.).

---

## GitHub Action (Optional)

The workflow `.github/workflows/sync-preview-env.yml` syncs Preview env vars on every PR and push to main. To enable:

1. Add secrets in GitHub → Settings → Secrets and variables → Actions:
   - `VERCEL_TOKEN` – from [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` – from `.vercel/project.json` or Vercel dashboard
   - `VERCEL_PROJECT_ID` – from `.vercel/project.json` or Vercel dashboard

2. Get org/project IDs: run `vercel link` locally, then check `.vercel/project.json`

---

## Related Scripts

| Script | Purpose |
|--------|---------|
| `sync-env-to-vercel.sh` | Sync .env.local to all Vercel environments (trims whitespace) |
| `fix-preview-supabase-env.sh` | Sync Preview env from .env.local (idempotent, run by deploy-prod) |
| `fix-cron-secret.sh` | One-time fix for CRON_SECRET whitespace (uses printf, no newline) |
| `diagnose-cron-secret.sh` | Diagnose CRON_SECRET in Vercel and .env.local |
| `deploy-prod.sh` | Deploy to production (auto-syncs Preview, then deploys) |
| `validate-env.js` | Build-time check that required vars exist |
