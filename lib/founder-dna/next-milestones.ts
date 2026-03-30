import type { NextMilestoneTeaser } from '@/lib/types/founder-dna'

type Input = {
  currentStreak: number
  totalTasks: number
  totalDecisions: number
  totalEvenings: number
}

const DEFS: Array<
  Omit<NextMilestoneTeaser, 'current' | 'remaining'> & {
    getCurrent: (i: Input) => number
  }
> = [
  {
    id: 'century_club',
    name: 'Century Club',
    icon: '💯',
    target: 100,
    badgeName: 'Century Club',
    getCurrent: (i) => i.totalTasks,
  },
  {
    id: 'streak_30',
    name: 'One Month Strong',
    icon: '🔥',
    target: 30,
    badgeName: 'One Month Strong',
    getCurrent: (i) => i.currentStreak,
  },
  {
    id: 'streak_60',
    name: 'Two Months Strong',
    icon: '⭐',
    target: 60,
    badgeName: 'Two Months Strong',
    getCurrent: (i) => i.currentStreak,
  },
  {
    id: 'streak_90',
    name: 'Quarter of Greatness',
    icon: '👑',
    target: 90,
    badgeName: 'Quarter of Greatness',
    getCurrent: (i) => i.currentStreak,
  },
  {
    id: 'decision_master',
    name: 'Decision Master',
    icon: '🎯',
    target: 50,
    badgeName: 'Decision Master',
    getCurrent: (i) => i.totalDecisions,
  },
  {
    id: 'evening_habit',
    name: 'Evening Reflector',
    icon: '🌙',
    target: 30,
    badgeName: 'Evening Reflector',
    getCurrent: (i) => i.totalEvenings,
  },
]

/** Incomplete milestones, closest finish first. */
export function computeNextMilestones(input: Input): NextMilestoneTeaser[] {
  const rows: NextMilestoneTeaser[] = []
  for (const d of DEFS) {
    const current = Math.min(d.getCurrent(input), d.target)
    const remaining = Math.max(0, d.target - current)
    if (remaining <= 0) continue
    rows.push({
      id: d.id,
      name: d.name,
      icon: d.icon,
      target: d.target,
      current,
      remaining,
      badgeName: d.badgeName,
    })
  }
  rows.sort((a, b) => a.remaining - b.remaining)
  return rows
}

/** All definitions with progress (including completed) for milestones page. */
export function computeAllMilestoneProgress(input: Input): NextMilestoneTeaser[] {
  return DEFS.map((d) => {
    const current = Math.min(d.getCurrent(input), d.target)
    const remaining = Math.max(0, d.target - current)
    return {
      id: d.id,
      name: d.name,
      icon: d.icon,
      target: d.target,
      current,
      remaining,
      badgeName: d.badgeName,
    }
  }).sort((a, b) => {
    if (a.remaining === 0 && b.remaining > 0) return 1
    if (b.remaining === 0 && a.remaining > 0) return -1
    return a.remaining - b.remaining
  })
}
