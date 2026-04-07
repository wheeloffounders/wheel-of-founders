/**
 * Shadow archetype matrix for pre–full-reveal founders (first ~3 days of signal).
 * Complements numeric scoring in `tracking.ts` with explicit strategy / friction / density bands.
 */
import type { UserSignalsSnapshot } from '@/lib/admin/get-user-signals'
import { computeShadowArchetype, type ShadowArchetypeName, type ShadowArchetypeResult } from '@/lib/admin/tracking'

export type ShadowEngineResult = {
  shadow_archetype: ShadowArchetypeName
  /** True when account is still before the ~21d Founder DNA preview milestone (product convention). */
  preRevealWindow: boolean
  base: ShadowArchetypeResult
  matrix: {
    strategicPctHigh: boolean
    inputDepthBand: 'low' | 'medium' | 'high'
    actionDensityBand: 'low' | 'medium' | 'high'
    frictionBand: 'low' | 'medium' | 'high'
  }
  /** Short hints for AI / admin copy. */
  rationale: string[]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function band3(n: number, low: number, high: number): 'low' | 'medium' | 'high' {
  if (n < low) return 'low'
  if (n > high) return 'high'
  return 'medium'
}

/**
 * Score shadow archetype from a `UserSignalsSnapshot` (e.g. from `fetchUserSignals`).
 * Applies friction + strategy-ratio nudges on top of the core 4-way scorer.
 */
export function computeShadowFromUserSignals(signals: UserSignalsSnapshot): ShadowEngineResult {
  const preRevealWindow = signals.accountAgeDays < 21

  const base = computeShadowArchetype({
    whyTexts: signals.whyTexts,
    tasksTotal: signals.taskRows,
    tasksCompleted: signals.completedTasks,
    strategicCount: signals.strategicCount,
    tacticalCount: signals.tacticalCount,
    eveningMoodEnergy: signals.eveningMoodEnergy,
  })

  const strategicPct = signals.strategicRatio
  const strategicPctHigh = strategicPct >= 0.7

  const inputDepth = signals.avgWhyWordCount + signals.avgEveningReflectionWords * 0.6
  const inputDepthBand = band3(inputDepth, 25, 70)

  const actionDensityBand = band3(signals.avgTasksPerMorningDay, 1.2, 2.2)

  const frictionBand = band3(signals.postponementCountFirst72h, 1, 4)

  const rationale: string[] = []
  const scores = { ...base.scores }

  if (strategicPctHigh) {
    rationale.push('Strategy ratio ≥70% — lean Visionary/Strategist on decisions.')
    scores.visionary = clamp01(scores.visionary + 0.06)
    scores.strategist = clamp01(scores.strategist + 0.08)
  }

  if (inputDepthBand === 'high') {
    rationale.push('High input depth (Why + reflections) — Visionary / Hybrid tilt.')
    scores.visionary = clamp01(scores.visionary + 0.05)
  }

  if (actionDensityBand === 'high') {
    rationale.push('High action density (tasks per morning) — Hustler / Builder tilt.')
    scores.hustler = clamp01(scores.hustler + 0.05)
    scores.builder = clamp01(scores.builder + 0.05)
  }

  if (frictionBand === 'high') {
    rationale.push('Elevated postponements in first 72h — friction response → Builder/Hustler.')
    scores.builder = clamp01(scores.builder + 0.06)
    scores.hustler = clamp01(scores.hustler + 0.05)
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [ShadowArchetypeName, number][]
  const top = entries[0]!
  const second = entries[1]!
  const shadow_archetype: ShadowArchetypeName =
    top[1] - second[1] < 0.12 ? 'hybrid' : top[0]

  return {
    shadow_archetype,
    preRevealWindow,
    base,
    matrix: {
      strategicPctHigh,
      inputDepthBand,
      actionDensityBand,
      frictionBand,
    },
    rationale,
  }
}
