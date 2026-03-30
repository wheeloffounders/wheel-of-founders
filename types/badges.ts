export type Badge = {
  name: string
  label: string
  description: string
  icon: string
  unlocked_at: string
}

export type BadgeName = 'first_spark' | 'one_week_strong' // add others later

export const BADGE_DEFINITIONS: Record<BadgeName, Omit<Badge, 'unlocked_at'>> = {
  first_spark: {
    name: 'first_spark',
    label: 'First Day Badge',
    description: 'Completed your first morning reflection',
    icon: '🌟',
  },
  one_week_strong: {
    name: 'one_week_strong',
    label: 'One Week Strong',
    description: 'Completed 7 morning reflections',
    icon: '🔥',
  },
}

