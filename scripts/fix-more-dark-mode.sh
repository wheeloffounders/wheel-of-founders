#!/bin/bash
# Additional Dark Mode Fixes

echo "🔧 Starting additional dark mode fixes..."

# 1. Weekly Insight page - titles and cards white
echo "📊 Fixing Weekly Insight page..."
find app/weekly -type f -name "*.tsx" | while read file; do
  sed -i '' \
    -e 's/text-gray-900 dark:text-gray-100/text-gray-900 
dark:text-white/g' \
    -e 's/text-gray-800 dark:text-gray-200/text-gray-800 
dark:text-white/g' \
    -e 's/text-gray-700 dark:text-gray-300/text-gray-700 
dark:text-white/g' \
    "$file"
  echo "  ✅ $file"
done

# 2. Monthly Insight - themes white
echo "📅 Fixing Monthly Insight page..."
if [ -d "app/monthly-insight" ]; then
  find app/monthly-insight -type f -name "*.tsx" | while read file; do
    sed -i '' -e 's/text-gray-700 dark:text-gray-300/text-gray-700 
dark:text-white/g' "$file"
    echo "  ✅ $file"
  done
fi

# 3. Quarterly - Defining Moments navy
echo "📈 Fixing Quarterly page..."
if [ -d "app/quarterly" ]; then
  find app/quarterly -type f -name "*.tsx" | while read file; do
    sed -i '' -e 's/text-gray-900 dark:text-white/text-gray-900 
dark:text-navy-200/g' "$file"
    echo "  ✅ $file"
  done
fi

# 4. Morning page fixes
echo "☀️ Fixing Morning page..."
if [ -f "app/morning/page.tsx" ]; then
  sed -i '' \
    -e 's/text-navy-800 dark:text-white/text-navy-800 dark:text-white/g' \
    -e 's/Impact check/Impact check/g' \
    app/morning/page.tsx
  echo "  ✅ app/morning/page.tsx"
fi

# 5. Evening page fixes
echo "🌙 Fixing Evening page..."
if [ -f "app/evening/page.tsx" ]; then
  sed -i '' \
    -e 's/text-navy-800 dark:text-white/text-navy-800 dark:text-white/g' \
    app/evening/page.tsx
  echo "  ✅ app/evening/page.tsx"
fi

echo "✅ Additional dark mode fixes complete!"
echo "⚠️  Review changes with: git diff"
echo "🚀 Then deploy: ./scripts/deploy-local.sh"
