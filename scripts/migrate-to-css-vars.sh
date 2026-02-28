#!/bin/bash
echo "Migrating hardcoded colors to CSS variables..."
# Text colors
find app components -type f -name "*.tsx" -exec sed -i '' -e 's/text-gray-900/text-primary/g' -e 's/text-gray-800/text-primary/g' -e 's/text-gray-700/text-secondary/g' -e 's/text-gray-600/text-secondary/g' -e 's/text-gray-500/text-muted/g' -e 's/text-navy-800/text-navy/g' -e 's/text-navy-600/text-navy/g' {} +
# Background colors
find app components -type f -name "*.tsx" -exec sed -i '' -e 's/bg-white/bg-card/g' -e 's/bg-gray-50/bg-secondary/g' -e 's/bg-gray-100/bg-secondary/g' {} +
# Border colors
find app components -type f -name "*.tsx" -exec sed -i '' -e 's/border-gray-200/border-primary/g' -e 's/border-gray-300/border-secondary/g' {} +
echo "Migration complete!"
