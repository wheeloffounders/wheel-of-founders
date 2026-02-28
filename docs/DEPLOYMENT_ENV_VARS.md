# Environment Variables Deployment Guide

This guide shows you exactly where to find each environment variable value needed for Vercel deployment.

## 🔐 CRON_SECRET

**Generated value:** (See terminal output above)

**Usage:** Copy this value when prompted by `npx vercel env add CRON_SECRET production`

---

## 🔵 Supabase Variables

### NEXT_PUBLIC_SUPABASE_URL
**Where to find:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)

**Format:** `https://xxxxx.supabase.co`

### NEXT_PUBLIC_SUPABASE_ANON_KEY
**Where to find:**
1. Same page: **Settings** → **API**
2. Under **Project API keys**, copy the **anon public** key
3. It's a long JWT token starting with `eyJ...`

**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long string)

### SUPABASE_SERVICE_ROLE_KEY
**Where to find:**
1. Same page: **Settings** → **API**
2. Under **Project API keys**, copy the **service_role** key (⚠️ SECRET - keep this safe!)
3. It's also a long JWT token starting with `eyJ...`

**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long string)

**⚠️ Important:** This key bypasses Row Level Security. Never expose it in client-side code.

---

## 🌐 App URL Variables

### NEXT_PUBLIC_APP_URL
**Value:** `https://wheel-of-founders-prod.vercel.app` (or your custom domain if you have one)

**Note:** No trailing slash!

### NEXT_PUBLIC_SITE_URL
**Value:** Same as `NEXT_PUBLIC_APP_URL` - `https://wheel-of-founders-prod.vercel.app`

**Note:** No trailing slash!

---

## 💳 Stripe Variables

### STRIPE_SECRET_KEY
**Where to find:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy the **Secret key** (starts with `sk_live_...`)

sk_live_YOUR_STRIPE_SECRET_KEY

**⚠️ Important:** Must be LIVE mode key, not test mode!

### STRIPE_PRO_MONTHLY_PRICE_ID
**Where to find:**
1. Stripe Dashboard → **Products**
2. Find your **Pro** tier product
3. Click on it
4. Under **Pricing**, find the **Monthly** price
5. Copy the **Price ID** (starts with `price_...`)

**Format:** `price_xxxxxxxxxxxxxxxxxxxxxxxx`

### STRIPE_PRO_ANNUAL_PRICE_ID
**Where to find:**
1. Same product (Pro tier)
2. Under **Pricing**, find the **Annual** price
3. Copy the **Price ID**

**Format:** `price_xxxxxxxxxxxxxxxxxxxxxxxx`

### STRIPE_PRO_PLUS_MONTHLY_PRICE_ID
**Where to find:**
1. Stripe Dashboard → **Products**
2. Find your **Pro Plus** tier product
3. Click on it
4. Under **Pricing**, find the **Monthly** price
5. Copy the **Price ID**

**Format:** `price_xxxxxxxxxxxxxxxxxxxxxxxx`

### STRIPE_PRO_PLUS_ANNUAL_PRICE_ID
**Where to find:**
1. Same product (Pro Plus tier)
2. Under **Pricing**, find the **Annual** price
3. Copy the **Price ID**

**Format:** `price_xxxxxxxxxxxxxxxxxxxxxxxx`

**Note:** If you don't have Pro Plus products yet, you can use placeholder values like `price_pro_plus_monthly` and `price_pro_plus_annual` and create them later.

---

## 🤖 OpenRouter Variable

### OPENROUTER_API_KEY
**Where to find:**
1. Go to [OpenRouter Dashboard](https://openrouter.ai)
2. Sign in
3. Go to **Keys** section
4. Copy your API key (starts with `sk-or-...`)

**Format:** `sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 📋 Quick Checklist

Before running the deployment script, have these ready:

- [ ] Supabase Project URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key
- [ ] CRON_SECRET (generated above)
- [ ] Stripe Live Secret Key
- [ ] Stripe Pro Monthly Price ID
- [ ] Stripe Pro Annual Price ID
- [ ] Stripe Pro Plus Monthly Price ID (or placeholder)
- [ ] Stripe Pro Plus Annual Price ID (or placeholder)
- [ ] OpenRouter API Key
- [ ] Production URL (will be `https://wheel-of-founders-prod.vercel.app`)

---

## 🚀 After Deployment

Once deployed, you'll need to:

1. **Add Stripe Webhook Secret:**
   - Create webhook endpoint in Stripe Dashboard
   - Copy the webhook secret (`whsec_...`)
   - Add to Vercel: `npx vercel env add STRIPE_WEBHOOK_SECRET production`
   - Redeploy: `npx vercel --prod`

2. **Update Supabase URLs:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Set Site URL to your production URL
   - Add Redirect URL: `https://wheel-of-founders-prod.vercel.app/auth/callback`
