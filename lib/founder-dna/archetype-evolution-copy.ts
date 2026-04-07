import type { ArchetypeName } from '@/lib/founder-archetypes'

export type ArchetypeEvolutionPreview = {
  nextLabel: string
  nextIcon: string
  /** What to shift in the data to “level up” the read */
  statsHint: string
}

const KNOWN: ArchetypeName[] = ['visionary', 'builder', 'hustler', 'strategist', 'hybrid']

function normalizeArchetype(name: string): ArchetypeName {
  return KNOWN.includes(name as ArchetypeName) ? (name as ArchetypeName) : 'hybrid'
}

/** Next-step identity flavor — coaching copy, not a second API unlock. */
export function getArchetypeEvolutionPreview(
  primaryName: string,
  strategicPct: number
): ArchetypeEvolutionPreview {
  const primary = normalizeArchetype(primaryName)
  const strategic = Math.round(strategicPct)
  switch (primary) {
    case 'visionary':
      return {
        nextLabel: 'Chief Strategist',
        nextIcon: '📐',
        statsHint: `Reduce tactical drift and deepen strategic focus: bias mornings toward one north-star lever, keep strategic share healthy (currently ${strategic}%), and let Milestone work anchor the week.`,
      }
    case 'strategist':
      return {
        nextLabel: 'Chief Strategist',
        nextIcon: '🔭',
        statsHint:
          'Bridge insight and execution: name the next strategic bet in writing, then protect one daily block where tactics serve that bet — not the other way around.',
      }
    case 'builder':
      return {
        nextLabel: 'Master Architect',
        nextIcon: '🏗️',
        statsHint:
          'Sharpen execution discipline: ship Milestone action plans on at least 5 days with clear done criteria — your signal levels up when output stays steady, not sporadic.',
      }
    case 'hustler':
      return {
        nextLabel: 'Sustainable Hustler',
        nextIcon: '🚀',
        statsHint:
          'Protect one recovery block weekly; your data levels up when urgency meets consistency, not just speed.',
      }
    case 'hybrid':
      return {
        nextLabel: 'Integrated Founder',
        nextIcon: '⚡',
        statsHint:
          'Lean slightly strategic or tactical for 7 days straight so your dominant signal sharpens past 70%.',
      }
    default:
      return {
        nextLabel: 'Evolved archetype',
        nextIcon: '✨',
        statsHint: 'Keep logging mornings and evenings — your next refresh will sharpen the signal.',
      }
  }
}
