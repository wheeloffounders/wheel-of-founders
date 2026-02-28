#!/bin/bash
# Local deployment script for Wheel of Founders
# Run this from your Mac to deploy to Vercel

echo "🚀 Deploying Wheel of Founders to production..."

# Navigate to project directory (in case script is run from elsewhere)
cd "$(dirname "$0")/.." || exit

# Check if user is logged in to Vercel
if ! npx vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run: npx vercel login"
    exit 1
fi

# Deploy to production
echo "📦 Building and deploying..."
npx vercel --prod

# Check if deployment succeeded
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🔗 Live at: https://wheel-of-founders-prod.vercel.app"
else
    echo "❌ Deployment failed. Check the error message above."
    exit 1
fi

