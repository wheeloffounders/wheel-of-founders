#!/bin/bash
# Dark Mode Fix Script - Run this ONCE to fix all color classes

echo "🔧 Starting dark mode fix..."

# Fix text colors
echo "📝 Fixing text colors..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" \) -print0 | 
while IFS= read -r -d '' file; do
  sed -i '' \
    -e 's/text-gray-900/text-gray-900 dark:text-gray-100/g' \
    -e 's/text-gray-800/text-gray-800 dark:text-gray-200/g' \
    -e 's/text-gray-700/text-gray-700 dark:text-gray-300/g' \
    -e 's/text-gray-600/text-gray-600 dark:text-gray-400/g' \
    -e 's/text-gray-500/text-gray-500 dark:text-gray-500/g' \
    -e 's/text-navy-800/text-navy-800 dark:text-white/g' \
    -e 's/text-navy-600/text-navy-600 dark:text-gray-300/g' \
    "$file"
  echo "  ✅ $file"
done

# Fix background colors
echo "🎨 Fixing background colors..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" \) -print0 | 
while IFS= read -r -d '' file; do
  sed -i '' \
    -e 's/bg-white/bg-white dark:bg-gray-800/g' \
    -e 's/bg-gray-50/bg-gray-50 dark:bg-gray-900/g' \
    -e 's/bg-gray-100/bg-gray-100 dark:bg-gray-800/g' \
    -e 's/bg-navy-50/bg-navy-50 dark:bg-gray-900/g' \
    "$file"
  echo "  ✅ $file"
done

# Fix border colors
echo "🔲 Fixing border colors..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" \) -print0 | 
while IFS= read -r -d '' file; do
  sed -i '' \
    -e 's/border-gray-200/border-gray-200 dark:border-gray-700/g' \
    -e 's/border-gray-300/border-gray-300 dark:border-gray-600/g' \
    "$file"
  echo "  ✅ $file"
done

# Fix card-specific classes
echo "🃏 Fixing card colors..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" \) -print0 | 
while IFS= read -r -d '' file; do
  sed -i '' \
    -e 's/bg-card/bg-white dark:bg-gray-800/g' \
    -e 's/text-card-foreground/text-gray-900 dark:text-gray-100/g' \
    "$file"
  echo "  ✅ $file"
done

echo "✅ Dark mode fix complete!"
echo "⚠️  Review changes with: git diff"
echo "🚀 Then deploy: ./scripts/deploy-local.sh"
