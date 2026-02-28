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

echo "🚀 Deploying to PRODUCTION..."

# Bump version using timestamp (must run before build so new version is baked in)
echo "📝 Bumping version..."
node scripts/version-bump.js
echo "✅ Version updated (see above). New version will be live after deploy."

# Build
echo "🏗️  Building..."
NEXT_PUBLIC_APP_ENV=production npm run build

# Deploy
echo "📦 Deploying to Vercel..."
$VERCEL_CMD --prod --force

echo "✅ Production deployment complete!"
echo "⚠️  Users will be forced to update on next page load."
