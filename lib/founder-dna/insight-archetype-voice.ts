/**
 * Maps API primary archetype `name` to coaching “voice” for DNA insight cards.
 * Strategist → operator vocabulary (systems / protocol), per product copy direction.
 */
export type InsightArchetypeVoice = 'builder' | 'visionary' | 'operator' | 'hustler' | 'hybrid'

export function toInsightArchetypeVoice(primaryName: string | null | undefined): InsightArchetypeVoice | null {
  if (!primaryName || typeof primaryName !== 'string') return null
  const n = primaryName.trim().toLowerCase()
  if (n === 'visionary') return 'visionary'
  if (n === 'builder') return 'builder'
  if (n === 'hustler') return 'hustler'
  if (n === 'strategist') return 'operator'
  if (n === 'hybrid') return 'hybrid'
  return 'hybrid'
}
