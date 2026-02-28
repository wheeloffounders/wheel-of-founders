#!/bin/bash
# Step-by-step deployment script for Wheel of Founders
# This script guides you through each step

set -e

echo "🚀 Wheel of Founders - Step-by-Step Deployment"
echo "=============================================="
echo ""

# Step 1: Check Vercel login
echo "📋 Step 1: Checking Vercel authentication..."
if npx vercel whoami &>/dev/null; then
    echo "✅ Already logged into Vercel"
    npx vercel whoami
else
    echo "⚠️  Not logged in. Please run: npx vercel login"
    echo "   (This will open a browser for authentication)"
    exit 1
fi

echo ""
echo "📋 Step 2: Checking current environment variables..."
echo ""
npx vercel env ls

echo ""
echo "📝 Step 3: Adding Environment Variables"
echo "========================================"
echo ""
echo "You'll be prompted for each value. Have these ready:"
echo ""
echo "From Supabase Dashboard:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "App URLs (use these exact values):"
echo "  - NEXT_PUBLIC_APP_URL: https://wheel-of-founders-prod.vercel.app"
echo "  - NEXT_PUBLIC_SITE_URL: https://wheel-of-founders-prod.vercel.app"
echo ""
echo "From Stripe Dashboard (Live mode):"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_PRO_MONTHLY_PRICE_ID"
echo "  - STRIPE_PRO_ANNUAL_PRICE_ID"
echo "  - STRIPE_PRO_PLUS_MONTHLY_PRICE_ID"
echo "  - STRIPE_PRO_PLUS_ANNUAL_PRICE_ID"
echo ""
echo "Generated CRON_SECRET:"
echo "  - CRON_SECRET: ecb029f518b7c92a59130f88aff5f2b5be0f8051982d3a0657344d42f7e88249"
echo ""
echo "From OpenRouter Dashboard:"
echo "  - OPENROUTER_API_KEY"
echo ""
read -p "Press Enter when ready to start adding variables..."

# Add variables
echo ""
echo "🔵 Adding Supabase variables..."
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo ""
echo "🌐 Adding App URL variables..."
npx vercel env add NEXT_PUBLIC_APP_URL production
npx vercel env add NEXT_PUBLIC_SITE_URL production

echo ""
echo "💳 Adding Stripe variables..."
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add STRIPE_PRO_MONTHLY_PRICE_ID production
npx vercel env add STRIPE_PRO_ANNUAL_PRICE_ID production
npx vercel env add STRIPE_PRO_PLUS_MONTHLY_PRICE_ID production
npx vercel env add STRIPE_PRO_PLUS_ANNUAL_PRICE_ID production

echo ""
echo "🔐 Adding CRON_SECRET..."
npx vercel env add CRON_SECRET production

echo ""
echo "🤖 Adding OpenRouter API key..."
npx vercel env add OPENROUTER_API_KEY production

echo ""
echo "✅ Step 4: Verifying all environment variables..."
echo ""
npx vercel env ls

echo ""
read -p "Review the variables above. Press Enter to continue with deployment..."

echo ""
echo "🚀 Step 5: Deploying to production..."
echo ""
npx vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Step 6: Running verification..."
echo ""
PROD_URL="https://wheel-of-founders-prod.vercel.app"
if [ -f "scripts/verify-production.js" ]; then
    VERCEL_URL="$PROD_URL" node scripts/verify-production.js
else
    echo "⚠️  Verification script not found. Skipping."
fi

echo ""
echo "✨ Deployment process complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Set up Stripe Webhook:"
echo "   - Go to Stripe Dashboard > Webhooks"
echo "   - Add endpoint: $PROD_URL/api/stripe/webhook"
echo "   - Select events: checkout.session.completed, customer.subscription.*, invoice.*"
echo "   - Copy webhook secret (whsec_...)"
echo "   - Run: npx vercel env add STRIPE_WEBHOOK_SECRET production"
echo "   - Redeploy: npx vercel --prod"
echo ""
echo "2. Update Supabase URLs:"
echo "   - Go to Supabase Dashboard > Authentication > URL Configuration"
echo "   - Set Site URL to: $PROD_URL"
echo "   - Add Redirect URL: $PROD_URL/auth/callback"
echo ""
echo "3. Test the deployment:"
echo "   - Visit: $PROD_URL"
echo "   - Test login flow"
echo "   - Test Stripe checkout (if applicable)"
echo ""
