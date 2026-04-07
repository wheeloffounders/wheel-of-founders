import type { BadgeDefinition } from '@/lib/badges/badge-definitions'
import type { JourneyMilestones } from '@/lib/types/founder-dna'

/** Progress toward a locked milestone badge; null = no bar (binary / unknown unlock) */
export function getBadgeProgressForMilestones(
  def: BadgeDefinition,
  m: JourneyMilestones
): { current: number; target: number } | null {
  const s = m.currentStreak
  const t = m.totalTasks
  const d = m.totalDecisions
  const e = m.totalEvenings

  const clamp = (current: number, target: number) =>
    current >= target ? null : { current: Math.min(current, target), target }

  switch (def.name) {
    case 'first_spark':
      return t >= 1 ? null : { current: 0, target: 1 }
    case 'one_week_strong':
      return clamp(s, 7)
    case 'two_weeks_strong':
      return clamp(s, 14)
    case 'three_weeks_strong':
      return clamp(s, 21)
    case 'one_month_strong':
      return clamp(s, 30)
    case 'two_months_strong':
      return clamp(s, 60)
    case 'quarter_of_greatness':
      return clamp(s, 90)
    case 'century_club':
      return clamp(t, 100)
    case 'execution_machine':
      return clamp(t, 500)
    case 'decision_maker':
      return clamp(d, 50)
    case 'evening_reflector':
      return clamp(e, 30)
    default:
      return null
  }
}
