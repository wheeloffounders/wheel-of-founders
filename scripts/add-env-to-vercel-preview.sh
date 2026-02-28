#!/bin/bash
# Add env vars from .env.local to Vercel (production, preview, development)
# Run from project root. Requires: npx vercel, .env.local
#
# Usage: ./scripts/add-env-to-vercel-preview.sh [.env.local]

set -e

ENV_FILE="${1:-.env.local}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found"
  exit 1
fi

ENVIRONMENTS=(production preview development)

# Variables to sync (order: public first, then private)
VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "OPENROUTER_API_KEY"
)

# Parse .env.local - handle KEY=value and KEY="value"
get_value() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

echo "Adding env vars from $ENV_FILE to Vercel (${ENVIRONMENTS[*]})..."
echo ""

for VAR in "${VARS[@]}"; do
  VAL=$(get_value "$VAR")
  if [ -z "$VAL" ]; then
    echo "⚠️  Skipping $VAR (not found or empty)"
    continue
  fi
  echo "Adding $VAR..."
  OK=true
  for ENV in "${ENVIRONMENTS[@]}"; do
    if printf '%s' "$VAL" | npx vercel env add "$VAR" "$ENV" --yes --force 2>/dev/null; then
      echo "  ✓ $VAR → $ENV"
    else
      echo "  ✗ $VAR → $ENV (run manually if needed)"
      OK=false
    fi
  done
done

echo ""
echo "Verifying with vercel env ls..."
npx vercel env ls 2>/dev/null || echo "(Run 'npx vercel env ls' to verify)"
