# Deploy via ZIP Upload (No Git)

Your project is packaged and ready. Follow these steps to deploy to a fresh Vercel project.

---

## Step 1: Locate the ZIP

**File:** `wheel-of-founders-final.zip`

- **Location 1:** `/Users/vanieho/Desktop/wheel-of-founders-final.zip` (project folder)
- **Location 2:** `/Users/vanieho/Desktop/wheel-of-founders-final.zip` (Desktop, if copy succeeded)

---

## Step 2: Create Fresh Vercel Project

1. Go to **https://vercel.com/new**
2. Click **"Deploy without Git"** or **"Upload"** (or drag & drop)
3. Upload `wheel-of-founders-final.zip`
4. **Project name:** `wheel-of-founders-v2` (or `wheel-of-founders-final`)
5. **Framework:** Next.js (auto-detected)
6. **Root Directory:** `.` (leave default)
7. **Do NOT click Deploy yet** – add env vars first

---

## Step 3: Add Environment Variables

In Vercel → Project → **Settings** → **Environment Variables**, add these for **Production** (and Preview if desired).

**Copy values from your `.env.local`** – do not use placeholder values.

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` |
| `OPENROUTER_API_KEY` | `.env.local` |
| `NEXT_PUBLIC_APP_URL` | `https://wheel-of-founders-v2.vercel.app` (use your actual Vercel URL) |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXT_PUBLIC_APP_URL` |

**Optional but recommended:**
| Variable | Notes |
|----------|-------|
| `CRON_SECRET` | `openssl rand -hex 32` |
| `ADMIN_SECRET` | If you use admin routes |

**After first deploy** (if using Stripe):
| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook after deploy |
| `STRIPE_PRO_*_PRICE_ID` | Stripe Products |

---

## Step 4: Deploy

1. Click **Deploy**
2. Wait for build to complete (~2–3 min)
3. Note your deployment URL (e.g. `https://wheel-of-founders-v2.vercel.app`)

---

## Step 5: Update App URL (if needed)

If your Vercel URL is different from what you set:

1. Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` to your actual URL
3. Redeploy (Deployments → ⋮ → Redeploy)

---

## Step 6: Test

1. **Ping test:** `https://your-url.vercel.app/api/ping-app`  
   Should return: `{"ok":true,"source":"app-router","timestamp":"..."}`

2. **Health check:** `https://your-url.vercel.app/api/health`  
   Should return: `{"status":"ok",...}`

3. **Generate an insight:** Log in, go to Morning/Evening/Weekly, trigger an AI insight.  
   If it fails, the UI will show the exact error (model, status, message).

---

## Step 7: Supabase Redirect URLs

After deploy, add your new Vercel URL to Supabase:

1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL:** `https://wheel-of-founders-v2.vercel.app` (your URL)
3. **Redirect URLs:** Add `https://wheel-of-founders-v2.vercel.app/**`
4. Save

---

## Troubleshooting

- **Build fails:** Check build logs. Common: missing env vars, Node version.
- **API 404:** If `/api/ping-app` 404s, the upload deploy may have different behavior than Git deploy. Try clearing build cache and redeploying.
- **AI errors:** The app now shows real errors. Copy the full `[AI ERROR]` message and we can fix it.
