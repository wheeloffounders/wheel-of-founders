import type { ArchetypeName } from '@/lib/founder-archetypes'

/** Rolling window for dynamic identity (aligned with task/action-plan signals). */
export const QUARTERLY_ROLLING_DAYS = 90

/** Builder/Hustler → Strategist-style shift when recent decisions skew strategic. */
export const STRATEGIC_SHIFT_THRESHOLD = 0.7

export const MIN_ROLLING_DECISIONS = 8

export type QuarterlyArchetypeEvaluation = {
  /** True when prior snapshot exists and we used last-90d decision counts for compute. */
  usedRollingWindow: boolean
  strategicPctRolling: number
  totalRollingDecisions: number
}

/**
 * Decide whether a primary change should be recorded as an evolution (lineage + modal).
 * Requires a persisted prior archetype and a recompute on rolling decision data.
 */
export function evaluateQuarterlyArchetypeShift(input: {
  previousPrimary: string | null
  computedPrimary: string
  strategicPctRolling: number
  totalRollingDecisions: number
  usedRollingWindow: boolean
}): { shouldRecordEvolution: boolean; isStrategicBreakthrough: boolean } {
  const {
    previousPrimary,
    computedPrimary,
    strategicPctRolling,
    totalRollingDecisions,
    usedRollingWindow,
  } = input

  if (!previousPrimary || previousPrimary === computedPrimary) {
    return { shouldRecordEvolution: false, isStrategicBreakthrough: false }
  }
  if (!usedRollingWindow || totalRollingDecisions < MIN_ROLLING_DECISIONS) {
    return { shouldRecordEvolution: false, isStrategicBreakthrough: false }
  }

  const executionHeavy = previousPrimary === 'builder' || previousPrimary === 'hustler'
  const strategyHeavy: ArchetypeName[] = ['strategist', 'visionary', 'hybrid']
  const isStrategicBreakthrough =
    strategicPctRolling >= STRATEGIC_SHIFT_THRESHOLD &&
    executionHeavy &&
    strategyHeavy.includes(computedPrimary as ArchetypeName)

  return { shouldRecordEvolution: true, isStrategicBreakthrough }
}

/** UI copy: Builder/Hustler → strategist-class archetype with high strategic share. */
export function isStrategicBreakthroughNarrative(input: {
  fromPrimary: string
  toPrimary: string
  strategicPctRolling: number
}): boolean {
  const { fromPrimary, toPrimary, strategicPctRolling } = input
  const executionHeavy = fromPrimary === 'builder' || fromPrimary === 'hustler'
  const strategyHeavy: ArchetypeName[] = ['strategist', 'visionary', 'hybrid']
  return (
    strategicPctRolling >= STRATEGIC_SHIFT_THRESHOLD &&
    executionHeavy &&
    strategyHeavy.includes(toPrimary as ArchetypeName)
  )
}
