#!/bin/bash
# Deploy Wheel of Founders to Vercel PRODUCTION
# 1. Bumps version in lib/version.ts
# 2. Builds with production environment
# 3. Deploys to Vercel production
# Users will be forced to update on next page load (ForceUpdateChecker).
#
# Works with Vercel CLI installed globally or via npx. macOS compatible.

set -e

# Resolve Vercel command: prefer npx (works with local/global install), fallback to vercel in PATH
resolve_vercel() {
  if command -v npx &>/dev/null; then
    echo "npx vercel"
    return
  fi
  if command -v vercel &>/dev/null; then
    echo "vercel"
    return
  fi
  echo ""
}

VERCEL_CMD=$(resolve_vercel)
if [ -z "$VERCEL_CMD" ]; then
  echo "❌ Error: Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

echo "🚀 PRODUCTION DEPLOYMENT"
echo "========================"

# Step 1: Sync Preview env vars (Preview deployments need these too)
echo ""
echo "🔍 Step 1: Syncing Preview environment variables..."
if [ -f ./scripts/fix-preview-supabase-env.sh ]; then
  ./scripts/fix-preview-supabase-env.sh
else
  echo "⚠️  Preview sync script not found, skipping..."
fi

# Step 2: Check Production env vars
if ! $VERCEL_CMD env ls 2>/dev/null | grep -q "NEXT_PUBLIC_SUPABASE_URL.*Production"; then
  echo "❌ Production environment variables may be missing!"
  echo "   Run ./scripts/sync-env-to-vercel.sh first"
  exit 1
fi
echo "✅ Production env vars present"

# Step 3: Bump version (must run before build so new version is baked in)
echo ""
echo "📝 Step 3: Bumping version..."
node scripts/version-bump.js
echo "✅ Version updated (see above). New version will be live after deploy."

# Step 4: Build
echo ""
echo "🏗️  Step 4: Building..."
NEXT_PUBLIC_APP_ENV=production npm run build

# Step 5: Deploy
echo ""
echo "📦 Step 5: Deploying to Vercel..."
$VERCEL_CMD --prod --force

echo "✅ Production deployment complete!"
echo "⚠️  Users will be forced to update on next page load."
