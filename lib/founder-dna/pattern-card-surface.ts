/** Outer chrome for pattern modules — omitted when nested in PatternsBlueprintCard. */
export function patternModuleSurfaceClass(embedded: boolean, extra?: string) {
  if (embedded) return extra ?? ''
  return [
    'rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}
