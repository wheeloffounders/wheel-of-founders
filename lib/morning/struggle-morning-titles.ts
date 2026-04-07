/**
 * Pro morning UI: map onboarding "Biggest Struggles" (user_profiles.struggles ids)
 * to pivot header + strategic stream section titles.
 * @see lib/founder-struggles.ts for canonical ids.
 */

export type StruggleMorningTitlePair = {
  headerTitle: string
  sectionTitle: string
}

const STRUGGLE_TO_TITLES: Record<string, StruggleMorningTitlePair> = {
  meaningful: { headerTitle: 'Core Objective', sectionTitle: 'Needle Movers' },
  overwhelm: { headerTitle: 'Current Focus', sectionTitle: 'Stress Reducers' },
  stuck: { headerTitle: 'The Breakthrough', sectionTitle: 'Momentum Builders' },
  focus: { headerTitle: 'Single Intent', sectionTitle: 'Deep Work Tasks' },
  systems: { headerTitle: 'System Architecture', sectionTitle: 'Standard Procedures' },
  calm: { headerTitle: 'Daily Anchor', sectionTitle: 'Intentional Actions' },
  work_life_balance: { headerTitle: 'Daily Anchor', sectionTitle: 'Intentional Actions' },
}

/** When several struggles are selected, prefer higher-weight ids first (systems / focus → …). */
const STRUGGLE_TITLE_PRIORITY = [
  'systems',
  'focus',
  'meaningful',
  'stuck',
  'overwhelm',
  'calm',
  'work_life_balance',
] as const

export const DEFAULT_STRUGGLE_MORNING_TITLES: StruggleMorningTitlePair =
  STRUGGLE_TO_TITLES.meaningful

export function resolveStruggleMorningTitles(
  selected: string[] | null | undefined
): StruggleMorningTitlePair {
  const ids = Array.isArray(selected)
    ? selected.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : []
  if (ids.length === 0) return DEFAULT_STRUGGLE_MORNING_TITLES

  const set = new Set(ids)
  for (const key of STRUGGLE_TITLE_PRIORITY) {
    if (set.has(key) && STRUGGLE_TO_TITLES[key]) {
      return STRUGGLE_TO_TITLES[key]
    }
  }

  return DEFAULT_STRUGGLE_MORNING_TITLES
}
