#!/bin/bash
# Deploy Wheel of Founders to Vercel PREVIEW (development)
# Builds with development environment and deploys to preview URL
#
# Works with Vercel CLI installed globally or via npx. macOS compatible.

set -e

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

echo "=== Deploying to PREVIEW (development) ==="

echo ""
echo "🔍 Step 1: Syncing Preview environment variables..."
if [ -f ./scripts/fix-preview-supabase-env.sh ]; then
  ./scripts/fix-preview-supabase-env.sh
else
  echo "⚠️  Preview sync script not found - skipping."
fi

echo ""
echo "🔍 Step 2: Verifying Preview environment variables..."
PREVIEW_COUNT=$(npx vercel env ls 2>/dev/null | grep -c "Preview" || echo "0")
if [ "$PREVIEW_COUNT" -lt 3 ]; then
  echo "❌ ERROR: Preview environment still missing required vars!"
  echo "   Run: npx vercel env ls | grep -A5 Preview"
  echo "   Then manually add missing vars with:"
  echo "   npx vercel env add [KEY] preview"
  echo ""
  echo "   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi
echo "✅ Preview vars OK ($PREVIEW_COUNT references found)"

echo ""
echo "🔨 Step 3: Building for development..."
NEXT_PUBLIC_APP_ENV=development npm run build

echo ""
echo "🚀 Step 4: Deploying to Vercel preview..."
$VERCEL_CMD

echo ""
echo "=== Preview deployment complete ==="
