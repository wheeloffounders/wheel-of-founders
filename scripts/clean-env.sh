#!/bin/bash
# Remove stray \n characters from .env.local that cause "invalid API key" errors
# Run from project root: ./scripts/clean-env.sh

set -e

echo "🧹 Cleaning .env.local of \\n characters..."
echo ""

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

# Create backup
BACKUP=".env.local.backup-$(date +%Y%m%d-%H%M%S)"
cp .env.local "$BACKUP"
echo "✅ Backup created: $BACKUP"
echo ""

# Remove \n from end of quoted values (e.g. value"\n" -> value")
# Remove \n at end of line
# Use temp file for portability (macOS vs Linux sed -i)
if grep -q '\\n' .env.local; then
  sed 's/\\n"$/"/g' .env.local | sed 's/\\n$//g' > .env.local.tmp
  mv .env.local.tmp .env.local
  echo "✅ Cleaned .env.local (removed \\n characters)"
else
  echo "✅ No \\n characters found - .env.local is already clean"
fi

echo ""
echo "📋 Original backed up to $BACKUP"
echo ""
echo "🚀 Next step: npm run sync:envs"
echo ""
