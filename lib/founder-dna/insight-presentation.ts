import type { EnergyMoodInsightType } from '@/lib/types/founder-dna'

export function verdictForEnergyInsight(type: EnergyMoodInsightType): string {
  switch (type) {
    case 'energy_drop':
      return 'Energy dip signal'
    case 'mood_peak':
      return 'Mood lift signal'
    case 'correlation':
      return 'Mood–energy link'
    case 'recovery':
      return 'Recovery pattern'
    case 'weekly_rhythm':
      return 'Weekly rhythm'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function recommendationForEnergyInsight(type: EnergyMoodInsightType): string {
  switch (type) {
    case 'energy_drop':
      return 'Protect one lighter block after dips; pair heavy work with your steadier days.'
    case 'mood_peak':
      return 'Ride the lift: schedule meaningful work when your mood signal runs high.'
    case 'correlation':
      return 'Name the link you see; test one small change (sleep, movement, or load) and watch the curve.'
    case 'recovery':
      return 'Recovery is data—note what preceded the bounce so you can repeat the conditions.'
    case 'weekly_rhythm':
      return 'Anchor one non‑negotiable habit on your strongest weekday; let weaker days stay lighter.'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function verdictForPostponementPatterns(mostPostponed: string): string {
  const t = mostPostponed.trim()
  if (!t) return 'Postponement pattern'
  return `Focus friction: “${t.length > 40 ? `${t.slice(0, 37)}…` : t}”`
}

export function recommendationForPostponement(mostPostponed: string): string {
  const t = mostPostponed.trim()
  if (!t) {
    return 'Tomorrow, pick one task you’ve been avoiding and give it a 25‑minute first step before email.'
  }
  return `Give “${t.length > 32 ? `${t.slice(0, 29)}…` : t}” a tiny first slice tomorrow—before the day fills up.`
}
