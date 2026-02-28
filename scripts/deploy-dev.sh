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

echo "Building for development..."
NEXT_PUBLIC_APP_ENV=development npm run build

echo "Deploying to Vercel preview..."
$VERCEL_CMD

echo "=== Preview deployment complete ==="
