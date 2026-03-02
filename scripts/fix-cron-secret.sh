#!/bin/bash
# One-time fix: Remove CRON_SECRET with whitespace and re-add trimmed value
# Fully non-interactive - run from project root: ./scripts/fix-cron-secret.sh

set -e

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env.local not found"
  exit 1
fi

echo "🧹 Removing CRON_SECRET from all environments..."
npx vercel env rm CRON_SECRET production --yes 2>/dev/null || true
npx vercel env rm CRON_SECRET preview --yes 2>/dev/null || true
npx vercel env rm CRON_SECRET development --yes 2>/dev/null || true

# Get clean value (trim whitespace, quotes, and strip any newlines/carriage returns)
RAW_CRON=$(grep "^CRON_SECRET=" "$ENV_FILE" | cut -d '=' -f2- | sed -e 's/^[[:space:]"'\'']*//' -e 's/[[:space:]"'\'']*$//' | tr -d '\n\r' | head -1)

if [ -z "$RAW_CRON" ]; then
  echo "❌ CRON_SECRET not found in .env.local"
  exit 1
fi

# CRITICAL: Use printf not echo! echo adds trailing newline which gets stored as whitespace.
echo "📦 Adding trimmed CRON_SECRET to production..."
printf '%s' "$RAW_CRON" | npx vercel env add CRON_SECRET production --yes

echo "📦 Adding trimmed CRON_SECRET to preview..."
printf '%s' "$RAW_CRON" | npx vercel env add CRON_SECRET preview --yes

echo "📦 Adding trimmed CRON_SECRET to development..."
printf '%s' "$RAW_CRON" | npx vercel env add CRON_SECRET development --yes

echo ""
echo "✅ CRON_SECRET fixed! Run 'vercel --prod' to deploy."
echo "Verify: npx vercel env ls | grep CRON_SECRET -A2"
