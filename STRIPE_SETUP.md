# Stripe Payment Integration Setup

Complete guide for setting up Stripe payments for Pro and Pro+ subscriptions.

## Overview

The payment system uses Stripe Checkout for secure subscription management. Users can:
- Subscribe to Pro ($19/month annual or $24/month monthly)
- Subscribe to Pro+ ($39/month annual or $49/month monthly)
- Manage subscriptions (cancel/reactivate)
- Automatic tier updates via webhooks

## Prerequisites

1. Stripe account (https://stripe.com)
2. Stripe API keys (test and live)
3. Webhook endpoint configured

## Step 1: Install Stripe Package

```bash
npm install stripe
```

## Step 2: Set Up Stripe Products & Prices

### In Stripe Dashboard:

1. **Create Products:**
   - **Pro Plan**
     - Name: "Wheel of Founders Pro"
     - Description: "Unlimited history + Smart Constraints + Weekly AI insights"
   - **Pro+ Plan**
     - Name: "Wheel of Founders Pro+"
     - Description: "Everything in Pro + Real-time AI prompts + Video templates"

2. **Create Prices:**
   - **Pro Monthly**: $24/month, recurring
   - **Pro Annual**: $228/year ($19/month), recurring
   - **Pro+ Monthly**: $49/month, recurring
   - **Pro+ Annual**: $468/year ($39/month), recurring

3. **Copy Price IDs:**
   - Each price has a unique ID (starts with `price_`)
   - Copy these IDs for environment variables

## Step 3: Environment Variables

Add to `.env.local`:

```bash
# Stripe Secret Key (from Stripe Dashboard > Developers > API keys)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Webhook Secret (from webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Public Price IDs (for client-side checkout)
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_PLUS_MONTHLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_PLUS_ANNUAL_PRICE_ID=price_xxxxx

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Step 4: Database Migration

Run `017_add_stripe_columns.sql` in Supabase:

```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMPTZ;
```

## Step 5: Configure Stripe Webhook

### In Stripe Dashboard:

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `STRIPE_WEBHOOK_SECRET` in environment variables

### For Local Testing:

Use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook secret from the CLI output.

## Step 6: Test the Integration

### Test Checkout Flow:

1. Go to `/pricing` page
2. Select billing period (monthly/annual)
3. Click "Start Free Trial" on Pro or Pro+
4. Complete Stripe Checkout (use test card: `4242 4242 4242 4242`)
5. Verify redirect to `/settings/subscription?success=true`
6. Check user profile updated with subscription details

### Test Webhook Events:

1. **Subscription Created:**
   - Complete checkout
   - Verify `tier` updated in database
   - Verify `stripe_subscription_id` saved

2. **Subscription Updated:**
   - Change subscription in Stripe Dashboard
   - Verify webhook updates user profile

3. **Subscription Canceled:**
   - Cancel subscription via app
   - Verify `cancel_at_period_end` set
   - Verify user retains access until period end

4. **Payment Failed:**
   - Use test card that fails: `4000 0000 0000 0002`
   - Verify subscription status updated

## API Endpoints

### Create Checkout Session
```
POST /api/stripe/create-checkout
Body: { priceId: string, billingPeriod: 'monthly' | 'annual' }
Returns: { sessionId: string, url: string }
```

### Webhook Handler
```
POST /api/stripe/webhook
Handles: checkout.session.completed, subscription.*, invoice.*
```

### Cancel Subscription
```
POST /api/stripe/cancel-subscription
Body: { subscriptionId: string }
```

### Reactivate Subscription
```
POST /api/stripe/reactivate-subscription
Body: { subscriptionId: string }
```

## User Flow

1. **Subscribe:**
   - User clicks "Start Free Trial" on pricing page
   - Redirected to Stripe Checkout
   - Completes payment
   - Redirected back to `/settings/subscription?success=true`
   - Webhook updates user tier to `pro` or `pro_plus`

2. **Manage Subscription:**
   - User goes to `/settings/subscription`
   - Sees current plan, status, renewal date
   - Can cancel (access until period end)
   - Can reactivate if canceled

3. **Subscription Events:**
   - Payment succeeds → Subscription remains active
   - Payment fails → Status updated, user notified
   - Subscription canceled → Downgraded to `free` at period end
   - Subscription updated → Tier/status synced

## Tier Management

### Automatic Tier Updates:

- **Active Subscription** → Tier set to `pro` or `pro_plus`
- **Canceled/Expired** → Tier set to `free`
- **Beta Users** → Tier remains `beta` (all features unlocked)

### Feature Access:

Feature flags in `lib/features.ts` check tier:
- Free: 2 days history, no AI features
- Pro: Unlimited history, Smart Constraints, Weekly AI
- Pro+: Everything in Pro + Real-time AI, Video templates
- Beta: All features (Pro+ equivalent)

## Testing Cards

### Success Cards:
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - Amex

### Failure Cards:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

### 3D Secure:
- `4000 0025 0000 3155` - Requires authentication

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint to production URL
- [ ] Test all subscription flows
- [ ] Set up email notifications (Stripe)
- [ ] Configure dunning management (failed payments)
- [ ] Set up subscription analytics
- [ ] Test upgrade/downgrade flows
- [ ] Verify webhook security (signature verification)
- [ ] Test edge cases (expired cards, etc.)

## Troubleshooting

### Webhook Not Receiving Events:

1. Check webhook endpoint URL is correct
2. Verify webhook secret matches
3. Check Stripe Dashboard > Webhooks > Events
4. Use Stripe CLI for local testing

### Subscription Not Updating:

1. Check webhook logs in Stripe Dashboard
2. Verify database migration ran
3. Check `user_profiles` table for subscription data
4. Verify webhook handler is updating correct fields

### Checkout Not Redirecting:

1. Check `NEXT_PUBLIC_APP_URL` is set correctly
2. Verify success/cancel URLs in checkout session
3. Check browser console for errors

## Files Created/Modified

### New Files:
- ✅ `lib/stripe.ts` - Stripe client and utilities
- ✅ `app/api/stripe/create-checkout/route.ts` - Checkout session creation
- ✅ `app/api/stripe/webhook/route.ts` - Webhook handler
- ✅ `app/api/stripe/cancel-subscription/route.ts` - Cancel subscription
- ✅ `app/api/stripe/reactivate-subscription/route.ts` - Reactivate subscription
- ✅ `app/settings/subscription/page.tsx` - Subscription management UI
- ✅ `supabase/migrations/017_add_stripe_columns.sql` - Database schema
- ✅ `STRIPE_SETUP.md` - This guide

### Modified Files:
- ✅ `app/pricing/page.tsx` - Added checkout integration
- ✅ `app/settings/page.tsx` - Added subscription link
- ✅ `.env.example` - Added Stripe environment variables

## Support

For Stripe-specific issues:
- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For app-specific issues:
- Check webhook logs in Stripe Dashboard
- Check application logs for errors
- Verify database schema matches migration

Payment integration is complete! 💳✨
