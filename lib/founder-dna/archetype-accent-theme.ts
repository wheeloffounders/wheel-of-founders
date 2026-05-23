/** Solid top accent on blueprint cards — keyed to primary archetype. */
export function archetypeTopAccentClassName(primaryName: string | null | undefined): string {
  const key = primaryName?.toLowerCase().trim() ?? ''
  const map: Record<string, string> = {
    visionary: 'bg-violet-600',
    builder: 'bg-emerald-600',
    hustler: 'bg-amber-600',
    strategist: 'bg-slate-800',
    hybrid: 'bg-indigo-600',
  }
  return map[key] ?? 'bg-indigo-600'
}
