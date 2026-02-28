#!/bin/bash
# Fix Supabase env vars in Vercel Preview by syncing from .env.local
# Run from project root: ./scripts/fix-preview-supabase-env.sh

set -e

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found"
  exit 1
fi

echo "=== Syncing Supabase keys from .env.local to Vercel Preview ==="

get_val() {
  grep "^$1=" "$ENV_FILE" | sed "s/^$1=//;s/^\"//;s/\"$//" | head -1
}

ANON_KEY=$(get_val "NEXT_PUBLIC_SUPABASE_ANON_KEY")
URL=$(get_val "NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY=$(get_val "SUPABASE_SERVICE_ROLE_KEY")

if [ -z "$ANON_KEY" ] || [ -z "$URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Missing values in .env.local (NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
  exit 1
fi

echo "Removing existing Preview env vars (ignore 'not found' errors)..."
npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY preview --yes 2>/dev/null || true
npx vercel env rm NEXT_PUBLIC_SUPABASE_URL preview --yes 2>/dev/null || true
npx vercel env rm SUPABASE_SERVICE_ROLE_KEY preview --yes 2>/dev/null || true

# Use 'main' branch for Preview (CLI requires branch for non-interactive)
BRANCH="${VERCEL_PREVIEW_BRANCH:-main}"
echo "Adding correct values for Preview (branch: $BRANCH)..."
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview "$BRANCH" --value "$ANON_KEY" --yes
npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview "$BRANCH" --value "$URL" --yes
npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview "$BRANCH" --value "$SERVICE_KEY" --yes

echo ""
echo "✅ Done. Verify with: npx vercel env ls"
echo "Redeploy preview with: ./scripts/deploy-dev.sh"
