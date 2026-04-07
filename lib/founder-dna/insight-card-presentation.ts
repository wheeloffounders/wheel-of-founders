/**
 * Verdict + recommendation copy for Founder DNA insight cards.
 * Archetype maps to a small set of tones (builder / visionary / operator) for scenario tables.
 */

import type { ArchetypeName } from '@/lib/founder-archetypes'

export type InsightPresentationKind = 'energy' | 'postponement' | 'pattern' | 'default'

/** Coaching voice bucket for verdict + recommendation tables */
export type InsightVerdictTone = 'builder' | 'visionary' | 'operator'

type InsightScenario =
  | 'postponement'
  | 'energy_peak'
  | 'energy_rhythm'
  | 'mood_correlation'
  | 'decision_mix'
  | 'recovery'
  | 'generic'

const ARCHETYPE_TO_TONE: Record<ArchetypeName, InsightVerdictTone> = {
  builder: 'builder',
  hustler: 'builder',
  visionary: 'visionary',
  strategist: 'operator',
  hybrid: 'operator',
}

export function toInsightVerdictTone(
  currentArchetype: string | null | undefined
): InsightVerdictTone | null {
  if (!currentArchetype || typeof currentArchetype !== 'string') return null
  const n = currentArchetype.trim().toLowerCase() as ArchetypeName
  return ARCHETYPE_TO_TONE[n] ?? null
}

const VERDICT_POSTPONEMENT: Record<InsightVerdictTone, string> = {
  builder: 'Friction: bottleneck detected',
  visionary: 'Drift: tactical overload',
  operator: 'Protocol: execution drift',
}

const VERDICT_ENERGY_PEAK: Record<InsightVerdictTone, string> = {
  builder: 'Output: peak energy window',
  visionary: 'Signal: strategic leverage window',
  operator: 'System: peak throughput slot',
}

const VERDICT_ENERGY_RHYTHM: Record<InsightVerdictTone, string> = {
  builder: 'Momentum: energy rhythm',
  visionary: 'Signal: strategic alignment',
  operator: 'System: rhythm signal',
}

const VERDICT_MOOD_CORRELATION: Record<InsightVerdictTone, string> = {
  builder: 'Output: mood correlation',
  visionary: 'Signal: mood alignment',
  operator: 'System: mood correlation',
}

const VERDICT_DECISION_MIX: Record<InsightVerdictTone, string> = {
  builder: 'Output: decision mix',
  visionary: 'Leverage: decision mix',
  operator: 'Protocol: decision balance',
}

const VERDICT_RECOVERY: Record<InsightVerdictTone, string> = {
  builder: 'Velocity: recovery arc',
  visionary: 'Signal: realignment window',
  operator: 'System: stability check',
}

function detectScenario(description: string, kind: InsightPresentationKind): InsightScenario {
  const lower = description.trim().toLowerCase()

  if (kind === 'postponement' || lower.includes('postpon') || lower.includes('delay')) {
    return 'postponement'
  }
  if (
    (lower.includes('mood') && lower.includes('correlat')) ||
    (lower.includes('correlat') && (lower.includes('mood') || lower.includes('energy')))
  ) {
    return 'mood_correlation'
  }
  if (lower.includes('recover')) return 'recovery'
  if (lower.includes('strategic') || lower.includes('tactical')) return 'decision_mix'

  const isEnergyContext =
    kind === 'energy' ||
    lower.includes('weekend') ||
    (lower.includes('energy') && (lower.includes('lift') || lower.includes('rhythm'))) ||
    lower.includes('weekly rhythm')

  if (isEnergyContext) {
    const peakHint =
      lower.includes('peak') ||
      lower.includes('strongest') ||
      lower.includes('highest') ||
      lower.includes('max') ||
      (lower.includes('energy') && lower.includes('spike'))
    if (peakHint) return 'energy_peak'
    return 'energy_rhythm'
  }

  if (kind === 'pattern') {
    if (lower.includes('recover')) return 'recovery'
    if (lower.includes('mood') && lower.includes('peak')) return 'mood_correlation'
    if (lower.includes('correlation')) return 'mood_correlation'
    if (lower.includes('drop') || lower.includes('rhythm')) return 'energy_rhythm'
  }

  return 'generic'
}

function verdictForScenario(scenario: InsightScenario, tone: InsightVerdictTone | null): string {
  if (!tone) {
    switch (scenario) {
      case 'postponement':
        return 'Postponement alert: friction in focus time'
      case 'energy_peak':
      case 'energy_rhythm':
        return 'Energy rhythm signal'
      case 'mood_correlation':
        return 'Mood correlation signal'
      case 'decision_mix':
        return 'Decision style signal'
      case 'recovery':
        return 'Recovery pattern signal'
      default:
        return 'Insight signal'
    }
  }

  switch (scenario) {
    case 'postponement':
      return VERDICT_POSTPONEMENT[tone]
    case 'energy_peak':
      return VERDICT_ENERGY_PEAK[tone]
    case 'energy_rhythm':
      return VERDICT_ENERGY_RHYTHM[tone]
    case 'mood_correlation':
      return VERDICT_MOOD_CORRELATION[tone]
    case 'decision_mix':
      return VERDICT_DECISION_MIX[tone]
    case 'recovery':
      return VERDICT_RECOVERY[tone]
    default:
      return 'Insight signal'
  }
}

export function deriveInsightVerdict(
  description: string,
  kind: InsightPresentationKind,
  currentArchetype?: string | null
): string {
  const scenario = detectScenario(description, kind)
  const tone = toInsightVerdictTone(currentArchetype)

  if (scenario === 'generic') {
    const t = description.trim()
    const first = t.split(/[.!?\n]/)[0]?.trim() ?? t
    const short = first.length > 48 ? `${first.slice(0, 45)}…` : first
    return short.toUpperCase()
  }

  return verdictForScenario(scenario, tone).toUpperCase()
}

function recommendPostponement(tone: InsightVerdictTone | null): string {
  if (!tone) {
    return 'Recommendation: Tomorrow morning, lock one 25-minute Focus block for your top Milestone task before anything else hits your calendar.'
  }
  switch (tone) {
    case 'builder':
      return 'Recommendation: Batch similar tasks in one execution block tomorrow—start with what you postpone most to rebuild velocity.'
    case 'visionary':
      return 'Recommendation: Delegate or time-box tactical noise first so your morning plan can anchor on one strategic lever for the week.'
    case 'operator':
      return 'Recommendation: Add a fixed “protocol” slot for the class of work you delay—same time, same checklist—before other commitments land.'
  }
}

function recommendEnergy(tone: InsightVerdictTone | null): string {
  if (!tone) {
    return 'Recommendation: Batch your highest-leverage strategic work in the window where your energy signal is strongest — even one protected block changes the week.'
  }
  switch (tone) {
    case 'builder':
      return 'Recommendation: Stack high-output tasks in your peak energy window—ship one Milestone completion before inbox pulls you sideways.'
    case 'visionary':
      return 'Recommendation: Place your longest strategic thinking block where energy peaks—even one hour of clear “north star” work compounds.'
    case 'operator':
      return 'Recommendation: Align recurring tactical work with your steadiest energy band so the system runs without heroics.'
  }
}

function recommendDefaultByTone(tone: InsightVerdictTone | null): string {
  if (!tone) {
    return 'Recommendation: Pick one concrete behavior to test tomorrow morning, then log it in your evening reflection so your signal sharpens.'
  }
  switch (tone) {
    case 'builder':
      return 'Recommendation: Choose one throughput habit to test tomorrow—same task template, less context switching—and note what moved in your evening review.'
    case 'visionary':
      return 'Recommendation: Name one strategic bet for tomorrow and protect the first 30 minutes of your morning for it before tactical work expands.'
    case 'operator':
      return 'Recommendation: Document one repeatable step you can template tomorrow; systems scale when the playbook is one sentence clearer.'
  }
}

export function deriveInsightRecommendation(
  description: string,
  kind: InsightPresentationKind,
  currentArchetype?: string | null
): string {
  const t = description.trim()
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  const last = sentences.length > 1 ? sentences[sentences.length - 1]?.trim() : null
  if (last && last.length > 24 && last.length < 320) {
    return last.startsWith('Recommendation:') ? last : `Recommendation: ${last}`
  }

  const scenario = detectScenario(description, kind)
  const tone = toInsightVerdictTone(currentArchetype)

  if (scenario === 'postponement' || kind === 'postponement') {
    return recommendPostponement(tone)
  }
  if (
    scenario === 'energy_peak' ||
    scenario === 'energy_rhythm' ||
    kind === 'energy'
  ) {
    return recommendEnergy(tone)
  }

  return recommendDefaultByTone(tone)
}
