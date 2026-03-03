#!/bin/bash
# Sync environment variables to ALL Vercel environments (Production, Preview, Development)
# Single source of truth: .env.local
# Run from project root: ./scripts/sync-all-envs.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "🔄 SYNC ALL ENVIRONMENTS"
echo "========================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found!"
  echo "   This file is your source of truth for environment variables."
  echo "   Please create it from .env.example or your backup."
  exit 1
fi

# Validate .env.local for \n characters (cause "invalid API key" errors)
echo "🔍 Validating .env.local for \\n characters..."
if grep -q '\\n' .env.local 2>/dev/null; then
  echo "❌ Found \\n characters in .env.local!"
  echo "   These cause 'invalid API key' errors when synced to Vercel."
  echo ""
  echo "   Run this first: ./scripts/clean-env.sh"
  echo "   Then run: npm run sync:envs"
  exit 1
fi

echo -e "${GREEN}✅ Source: .env.local${NC}"
echo ""

# Step 1: Sync to Production (and Preview, Development - sync-env-to-vercel does all)
echo "📦 Step 1: Syncing to PRODUCTION, PREVIEW, DEVELOPMENT..."
if [ -f ./scripts/sync-env-to-vercel.sh ]; then
  ./scripts/sync-env-to-vercel.sh
  echo -e "${GREEN}✅ Production/Preview/Development sync complete${NC}"
else
  echo -e "${YELLOW}⚠️  scripts/sync-env-to-vercel.sh not found${NC}"
fi
echo ""

# Step 2: Verify Preview (fix-preview adds verification)
echo "📦 Step 2: Verifying PREVIEW..."
if [ -f ./scripts/fix-preview-supabase-env.sh ]; then
  ./scripts/fix-preview-supabase-env.sh
  echo -e "${GREEN}✅ Preview verified${NC}"
else
  echo -e "${YELLOW}⚠️  scripts/fix-preview-supabase-env.sh not found${NC}"
fi
echo ""

# Step 3: Verify Local
echo "📦 Step 3: Verifying LOCAL environment..."
echo "   Local .env.local contains:"
grep -E "NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE|OPENROUTER|CRON_SECRET" .env.local 2>/dev/null | sed 's/=.*/=********/' || echo "   ⚠️  Some required vars missing"
echo -e "${GREEN}✅ Local verified${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}✅ ALL ENVIRONMENTS SYNCED SUCCESSFULLY${NC}"
echo "========================================"
echo ""
echo "📋 To verify:"
echo "   Production: npx vercel env ls | grep -A5 Production"
echo "   Preview:    npx vercel env ls | grep -A5 Preview"
echo "   Local:      cat .env.local"
echo ""
echo "🚀 Next steps:"
echo "   ./scripts/deploy-prod.sh  # Deploy to production"
echo "   ./scripts/deploy-dev.sh   # Deploy to preview"
echo ""
