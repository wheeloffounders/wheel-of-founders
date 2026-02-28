#!/bin/bash
# Wheel of Founders - Production Deployment Script
# This script guides you through deploying to Vercel production

set -e

echo "🚀 Wheel of Founders - Production Deployment"
echo "==========================================="
echo ""

# Check if Vercel CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js."
    exit 1
fi

# Step 1: Check current environment variables
echo "📋 Step 1: Checking current Vercel environment variables..."
echo ""
npx vercel env ls
echo ""

# Step 2: Guide user to add environment variables
echo "📝 Step 2: Add Environment Variables"
echo "===================================="
echo ""
echo "You need to add the following environment variables to Vercel."
echo "Run each command below and enter the value when prompted:"
echo ""
echo "Required Variables:"
echo "-------------------"
echo ""
echo "# Supabase"
echo "npx vercel env add NEXT_PUBLIC_SUPABASE_URL production"
echo "npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production"
echo "npx vercel env add SUPABASE_SERVICE_ROLE_KEY production"
echo ""
echo "# App URLs (use your production URL)"
echo "npx vercel env add NEXT_PUBLIC_APP_URL production"
echo "npx vercel env add NEXT_PUBLIC_SITE_URL production"
echo ""
echo "# Stripe"
echo "npx vercel env add STRIPE_SECRET_KEY production"
echo "npx vercel env add STRIPE_PRO_MONTHLY_PRICE_ID production"
echo "npx vercel env add STRIPE_PRO_ANNUAL_PRICE_ID production"
echo "npx vercel env add STRIPE_PRO_PLUS_MONTHLY_PRICE_ID production"
echo "npx vercel env add STRIPE_PRO_PLUS_ANNUAL_PRICE_ID production"
echo ""
echo "# Cron Secret (generate with: openssl rand -hex 32)"
echo "npx vercel env add CRON_SECRET production"
echo ""
echo "# OpenRouter AI"
echo "npx vercel env add OPENROUTER_API_KEY production"
echo ""
echo "Note: STRIPE_WEBHOOK_SECRET will be added after first deployment"
echo ""
read -p "Press Enter after you've added all the environment variables above..."

# Step 3: Verify environment variables
echo ""
echo "✅ Step 3: Verifying environment variables..."
echo ""
npx vercel env ls
echo ""
read -p "Review the variables above. Press Enter to continue with deployment..."

# Step 4: Deploy to production
echo ""
echo "🚀 Step 4: Deploying to production..."
echo ""
npx vercel --prod

# Get the deployment URL
DEPLOYMENT_URL=$(npx vercel ls --prod | grep -m 1 "wheel-of-founders" | awk '{print $2}' || echo "")
if [ -z "$DEPLOYMENT_URL" ]; then
    echo "⚠️  Could not automatically detect deployment URL."
    echo "Please check Vercel dashboard for your production URL."
    read -p "Enter your production URL: " DEPLOYMENT_URL
fi

echo ""
echo "✅ Deployment complete!"
echo "Production URL: $DEPLOYMENT_URL"
echo ""

# Step 5: Run verification
echo "🔍 Step 5: Running verification checks..."
echo ""
if [ -f "scripts/verify-production.js" ]; then
    VERCEL_URL="$DEPLOYMENT_URL" node scripts/verify-production.js
else
    echo "⚠️  Verification script not found. Skipping verification."
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Set up Stripe Webhook:"
echo "   - Go to Stripe Dashboard > Webhooks"
echo "   - Add endpoint: $DEPLOYMENT_URL/api/stripe/webhook"
echo "   - Select events: checkout.session.completed, customer.subscription.*, invoice.*"
echo "   - Copy the webhook secret (whsec_...)"
echo "   - Run: npx vercel env add STRIPE_WEBHOOK_SECRET production"
echo "   - Redeploy: npx vercel --prod"
echo ""
echo "2. Update Supabase URLs:"
echo "   - Go to Supabase Dashboard > Authentication > URL Configuration"
echo "   - Set Site URL to: $DEPLOYMENT_URL"
echo "   - Add Redirect URL: $DEPLOYMENT_URL/auth/callback"
echo ""
echo "3. Test the deployment:"
echo "   - Visit: $DEPLOYMENT_URL"
echo "   - Test login flow"
echo "   - Test Stripe checkout (if applicable)"
echo ""
echo "✨ Deployment process complete!"
