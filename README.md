# Wheel of Founders

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/wheel-of-founders)

**Live demo:** [https://wheeloffounders.com](https://wheeloffounders.com) — *replace with your Vercel URL (e.g. `https://wheel-of-founders.vercel.app`) after first deploy*

Daily planning and reflection app for founders: Morning Power List, Evening Review, and AI coaching (Mrs. Deer). Built with Next.js, Supabase, and Stripe.

---

## Quick start (new developers)

1. **Clone and install**
   ```bash
   git clone https://github.com/your-org/wheel-of-founders.git
   cd wheel-of-founders
   npm install
   ```

2. **Environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in at least: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`. See [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) for full setup.

3. **Optional: validate env**
   ```bash
   node scripts/validate-env.js
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright E2E tests |
| `VERCEL_URL=<url> node scripts/verify-production.js` | Verify production deployment (health, auth, webhook, admin) |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Environment variables](docs/ENVIRONMENT_VARIABLES.md) | Env setup and where to get API keys |
| [Vercel deployment](docs/VERCEL_DEPLOYMENT.md) | **Start here for deploy:** env vars in order, Stripe webhook secret, Supabase URLs |
| [Production deployment](docs/PRODUCTION_DEPLOYMENT.md) | Full production checklist and monitoring |
| [Admin testing](docs/ADMIN_TESTING.md) | How to test admin access and data isolation with a fresh account |

---

## Health check

For monitoring and uptime checks:

```bash
curl https://your-domain.com/api/health
```

Returns JSON: `status`, `timestamp`, `environment`, and optional `database` (ok/error/skipped).

---

## Deploy on Vercel

Follow the **project-specific** guide: **[docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)**. It includes:

- Exact environment variables (in order) from `.env.example`
- How to get the production Stripe webhook secret and add it after first deploy
- How to update Supabase Site URL and Redirect URLs after deploy

**Quick sequence:**  
1. Create project, add env vars (no webhook secret yet), deploy.  
2. Create Stripe production webhook, add `STRIPE_WEBHOOK_SECRET` in Vercel, redeploy.  
3. Set Supabase Auth URL Configuration to your production URL.  
4. Run verification: `VERCEL_URL=https://your-domain.com node scripts/verify-production.js`  
5. Update the **Live demo** link at the top of this README with your actual URL.

---

## Tech stack

- **Next.js** (App Router) — UI and API routes  
- **Supabase** — Auth, Postgres, RLS  
- **Stripe** — Subscriptions and checkout  
- **OpenRouter** — AI prompts (Mrs. Deer)  
- **PostHog** — Product analytics (optional)

---

## License

Private / proprietary. All rights reserved.
