#!/bin/bash
# Diagnose CRON_SECRET whitespace issues
# Run from project root: ./scripts/diagnose-cron-secret.sh

echo "=== 1. CRON_SECRET in Vercel ==="
npx vercel env ls 2>/dev/null | grep -A3 CRON_SECRET || echo "  (run: npx vercel env ls)"

echo ""
echo "=== 2. Raw bytes in .env.local (cat -A shows $ as line end, ^M as carriage return) ==="
if [ -f .env.local ]; then
  grep "^CRON_SECRET=" .env.local | cat -A || echo "  CRON_SECRET not found"
else
  echo "  .env.local not found"
fi

echo ""
echo "=== 3. Value length (echo adds newline; printf does not) ==="
if [ -f .env.local ]; then
  RAW=$(grep "^CRON_SECRET=" .env.local | cut -d '=' -f2- | sed -e 's/^[[:space:]"'\'']*//' -e 's/[[:space:]"'\'']*$//' | tr -d '\n\r' | head -1)
  echo "  Length via printf: $(printf '%s' "$RAW" | wc -c)"
  echo "  Length via echo:   $(echo "$RAW" | wc -c)"
  echo "  (echo adds 1 for newline - that newline gets stored in Vercel!)"
fi

echo ""
echo "=== 4. Vercel project ==="
npx vercel project ls 2>/dev/null | head -5 || echo "  (run: npx vercel project ls)"
