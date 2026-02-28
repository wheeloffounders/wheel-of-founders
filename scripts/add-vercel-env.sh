#!/bin/bash
# Add environment variables to Vercel project via CLI
# Run from project root: bash scripts/add-vercel-env.sh
#
# See docs/VERCEL_ENV_CLI.md for full instructions including sensitive vars.

set -e
cd "$(dirname "$0")/.."

echo "=== Adding non-sensitive variables (Production) ==="

for var in "NEXT_PUBLIC_SUPABASE_URL:https://bqoovqkbntcynqhhmwwy.supabase.co" \
           "NEXT_PUBLIC_APP_URL:https://wheel-of-founders.vercel.app" \
           "NEXT_PUBLIC_SITE_URL:https://wheel-of-founders.vercel.app" \
           "OPENROUTER_MODEL:anthropic/claude-3.5-sonnet"; do
  name="${var%%:*}"
  value="${var#*:}"
  echo "Adding $name..."
  echo "$value" | npx vercel env add "$name" production 2>/dev/null || echo "  (skip - may exist)"
done

echo ""
echo "=== Run these manually for SENSITIVE vars (paste when prompted) ==="
echo "  npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production"
echo "  npx vercel env add SUPABASE_SERVICE_ROLE_KEY production"
echo "  npx vercel env add OPENROUTER_API_KEY production"
echo ""
echo "=== Verify: npx vercel env ls ==="
