#!/bin/bash
# Sync env vars from .env.local to Vercel Preview
# Idempotent - safe to run multiple times
# Run from project root: ./scripts/fix-preview-supabase-env.sh

set -e

echo "🔧 PREVIEW ENVIRONMENT VARIABLE SYNC"
echo "===================================="

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found. Cannot sync Preview environment."
  exit 1
fi

echo "📖 Reading from .env.local..."

get_val() {
  local key=$1
  grep -E "^${key}=" .env.local 2>/dev/null | sed -E 's/^[^=]+=//' | sed -e 's/^["\x27]//' -e 's/["\x27]$//' | tr -d '\n\r' | head -1
}

NEXT_PUBLIC_SUPABASE_URL=$(get_val "NEXT_PUBLIC_SUPABASE_URL")
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(get_val "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY=$(get_val "SUPABASE_SERVICE_ROLE_KEY")
OPENROUTER_API_KEY=$(get_val "OPENROUTER_API_KEY")
CRON_SECRET=$(get_val "CRON_SECRET")

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing required Supabase variables in .env.local"
  exit 1
fi

echo "✅ Required variables found"

add_env() {
  local key=$1
  local value=$2

  if [ -n "$value" ]; then
    echo "  📌 $key"
    npx vercel env rm "$key" preview --yes 2>/dev/null || true
    printf '%s' "$value" | npx vercel env add "$key" preview --yes
  fi
}

echo ""
echo "📦 Syncing to Preview environment..."
echo "-----------------------------------"

add_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
add_env "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
add_env "CRON_SECRET" "$CRON_SECRET"

echo "-----------------------------------"
echo "✅ Preview environment synced successfully!"
echo ""
echo "📋 Verify: npx vercel env ls | grep -A2 Preview"
