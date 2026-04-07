import type { ArchetypeEvolutionHistoryEntry } from '@/lib/types/founder-dna'

export function formatQuarterPeriodLabel(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1
  return `Q${q} ${d.getUTCFullYear()}`
}

export function parseEvolutionHistory(raw: unknown): ArchetypeEvolutionHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ArchetypeEvolutionHistoryEntry[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const fromPrimary = typeof o.fromPrimary === 'string' ? o.fromPrimary : null
    const toPrimary = typeof o.toPrimary === 'string' ? o.toPrimary : null
    const at = typeof o.at === 'string' ? o.at : null
    const periodLabel = typeof o.periodLabel === 'string' ? o.periodLabel : null
    if (!fromPrimary || !toPrimary || !at || !periodLabel) continue
    const strategicPctRolling =
      typeof o.strategicPctRolling === 'number' && Number.isFinite(o.strategicPctRolling)
        ? o.strategicPctRolling
        : undefined
    out.push({ fromPrimary, toPrimary, at, periodLabel, strategicPctRolling })
  }
  return out
}

export function prependEvolutionEntry(
  existing: unknown,
  entry: ArchetypeEvolutionHistoryEntry
): ArchetypeEvolutionHistoryEntry[] {
  const list = parseEvolutionHistory(existing)
  const dedup = list.filter(
    (e) => !(e.fromPrimary === entry.fromPrimary && e.toPrimary === entry.toPrimary && e.at === entry.at)
  )
  return [entry, ...dedup].slice(0, 24)
}
