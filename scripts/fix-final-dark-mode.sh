#!/bin/bash
# Final dark mode fixes for specific elements

echo "🔧 Applying final dark mode tweaks..."

# Weekly page
sed -i '' \
  -e 's/class="text-navy-800"/class="text-navy-800 dark:text-white"/g' \
  -e 's/class="text-gray-800 dark:text-gray-200"/class="text-gray-800 dark:text-white"/g' \
  app/weekly/page.tsx

# Monthly page
sed -i '' -e 's/class="text-gray-700 dark:text-gray-300"/class="text-gray-700 dark:text-white"/g' \
  app/monthly-insight/page.tsx

# Quarterly page
sed -i '' -e 's/class="text-gray-900 dark:text-white"/class="text-gray-900 dark:text-navy-200"/g' \
  app/quarterly/page.tsx

# Morning page
sed -i '' \
  -e 's/<h1 className="text-3xl font-bold text-navy-800 mb-6 text-center">/<h1 className="text-3xl font-bold 
text-navy-800 dark:text-white mb-6 text-center">/g' \
  app/morning/page.tsx

# Evening page
sed -i '' \
  -e 's/text-navy-800 mb-6 text-center/text-navy-800 dark:text-white mb-6 text-center/g' \
  -e 's/text-gray-700 mb-2/text-gray-700 dark:text-white mb-2/g' \
  -e 's/text-gray-600 mb-2/text-gray-600 dark:text-white mb-2/g' \
  app/evening/page.tsx

echo "✅ Final fixes applied!"
echo "🚀 Run: ./scripts/deploy-local.sh"
