#!/bin/bash
# Helper script to add environment variables to Vercel
# Usage: ./scripts/add-env-vars.sh

echo "🔐 Adding Environment Variables to Vercel"
echo "=========================================="
echo ""
echo "This script will prompt you for each environment variable value."
echo "Have your values ready from docs/DEPLOYMENT_ENV_VARS.md"
echo ""
read -p "Press Enter to start..."

echo ""
echo "📋 Adding Supabase variables..."
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo ""
echo "🌐 Adding App URL variables..."
echo "For NEXT_PUBLIC_APP_URL, enter: https://wheel-of-founders-prod.vercel.app"
npx vercel env add NEXT_PUBLIC_APP_URL production
echo "For NEXT_PUBLIC_SITE_URL, enter: https://wheel-of-founders-prod.vercel.app"
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
echo "Enter this value: ecb029f518b7c92a59130f88aff5f2b5be0f8051982d3a0657344d42f7e88249"
npx vercel env add CRON_SECRET production

echo ""
echo "🤖 Adding OpenRouter API key..."
npx vercel env add OPENROUTER_API_KEY production

echo ""
echo "✅ All environment variables added!"
echo ""
echo "Next step: Run 'npx vercel --prod' to deploy"
