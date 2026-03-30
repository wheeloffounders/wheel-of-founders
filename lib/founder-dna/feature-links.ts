/** Links and copy for Founder DNA feature unlocks (What's New + navigation). */
export const FOUNDER_DNA_FEATURE_META: Record<
  string,
  { title: string; description: string; icon: string; link: string }
> = {
  first_glimpse: {
    title: 'First Glimpse',
    description: 'After your first evening reflection — a personal signal and a reason to come back tomorrow morning.',
    icon: '🔓',
    link: '/evening',
  },
  morning_insights: {
    title: 'Morning insights',
    description:
      'Mrs. Deer’s morning and post-plan insights unlock after your first full founder day — one day with activity plus your first evening reflection.',
    icon: '🌅',
    link: '/morning',
  },
  energy_trends: {
    title: 'Energy & Mood Trend',
    description: 'See how your energy and mood move together over time.',
    icon: '📊',
    link: '/founder-dna/patterns',
  },
  decision_style: {
    title: 'Decision Style',
    description: 'Your strategic vs tactical decision mix is ready to explore.',
    icon: '🎯',
    link: '/founder-dna/patterns',
  },
  founder_archetype: {
    title: 'Founder Archetype (Preview)',
    description: 'Emerging archetype read — unlocks at 21 days with entries.',
    icon: '🏷️',
    link: '/founder-dna/archetype',
  },
  founder_archetype_full: {
    title: 'Founder Archetype (Full)',
    description: 'Full profile with secondary traits — unlocks at 31 days with entries; refreshes every 90 days.',
    icon: '🔮',
    link: '/founder-dna/archetype',
  },
  postponement_patterns: {
    title: 'Postponement Patterns',
    description: 'Gentle observations about what you tend to delay.',
    icon: '⏳',
    link: '/founder-dna/patterns',
  },
  celebration_gap: {
    title: 'Celebration Gap',
    description: 'Mrs. Deer finds a hidden win inside something you named as a lesson.',
    icon: '🪞',
    link: '/founder-dna/rhythm',
  },
  recurring_question: {
    title: 'Recurring Question',
    description: 'Questions you ask yourself again and again — held lightly.',
    icon: '💫',
    link: '/founder-dna/patterns',
  },
  unseen_wins: {
    title: 'Unseen Wins',
    description: 'Mrs. Deer’s hidden pattern — generated when you open Rhythm (not the same as Your Story So Far).',
    icon: '✨',
    link: '/founder-dna/rhythm',
  },
  your_story_so_far: {
    title: 'Your Story So Far',
    description: 'A thread of recent wins from your evening reflections.',
    icon: '📖',
    link: '/founder-dna/rhythm',
  },
  weekly_insight: {
    title: 'Weekly Insight',
    description: 'Mrs. Deer’s weekly read on your rhythm — updates every Monday.',
    icon: '📅',
    link: '/weekly',
  },
  monthly_insight: {
    title: 'Monthly Insight',
    description: 'A deeper monthly narrative from your wins and lessons.',
    icon: '🌙',
    link: '/monthly-insight',
  },
  quarterly_insight: {
    title: 'Quarterly Trajectory',
    description: 'Your quarter-level arc and intention.',
    icon: '📈',
    link: '/quarterly',
  },
}

export function badgeWhatsNewMeta(unlockName: string): {
  title: string
  description: string
  icon: string
  link: string
} {
  if (unlockName === 'first_spark') {
    return {
      title: 'First Day Badge',
      description: 'You completed your first morning reflection.',
      icon: '🌟',
      link: '/dashboard',
    }
  }
  if (unlockName === 'founder_story') {
    return {
      title: 'Founder Story',
      description: 'You completed your founder profile.',
      icon: '📖',
      link: '/profile',
    }
  }
  const meta = FOUNDER_DNA_FEATURE_META[unlockName]
  if (meta) return meta
  return {
    title: unlockName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: 'A new badge appeared on your journey.',
    icon: '🎖️',
    link: '/dashboard',
  }
}
