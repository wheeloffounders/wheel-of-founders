import type { BadgeCelebrationTier } from '@/lib/types/founder-dna'

export type BadgeCategory = 'milestone' | 'discovery' | 'identity' | 'behavior' | 'reflection'

export type BadgeDefinition = {
  name: string
  label: string
  description: string
  icon: string
  category: BadgeCategory
  unlockHint: string
  /** minor = toast only; major = celebration modal; epic = modal + confetti + Mrs. Deer */
  celebrationTier: BadgeCelebrationTier
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Milestone
  {
    name: 'first_spark',
    label: 'First Spark',
    description: 'First morning task complete',
    icon: '✨',
    category: 'milestone',
    unlockHint: 'Complete your first morning task.',
    celebrationTier: 'epic',
  },
  {
    name: 'one_week_strong',
    label: 'One Week Strong',
    description: '7-day streak',
    icon: '🔥',
    category: 'milestone',
    unlockHint: 'Reach a 7-day streak.',
    celebrationTier: 'major',
  },
  {
    name: 'two_weeks_strong',
    label: 'Two Weeks Strong',
    description: '14-day streak',
    icon: '🔥🔥',
    category: 'milestone',
    unlockHint: 'Reach a 14-day streak.',
    celebrationTier: 'major',
  },
  {
    name: 'three_weeks_strong',
    label: 'Three Weeks Strong',
    description: '21-day streak',
    icon: '🔥🔥🔥',
    category: 'milestone',
    unlockHint: 'Reach a 21-day streak.',
    celebrationTier: 'major',
  },
  {
    name: 'one_month_strong',
    label: 'One Month Strong',
    description: '30-day streak',
    icon: '🌟',
    category: 'milestone',
    unlockHint: 'Reach a 30-day streak.',
    celebrationTier: 'epic',
  },
  {
    name: 'two_months_strong',
    label: 'Two Months Strong',
    description: '60-day streak',
    icon: '⭐',
    category: 'milestone',
    unlockHint: 'Reach a 60-day streak.',
    celebrationTier: 'major',
  },
  {
    name: 'quarter_of_greatness',
    label: 'Quarter of Greatness',
    description: '90-day streak',
    icon: '👑',
    category: 'milestone',
    unlockHint: 'Reach a 90-day streak.',
    celebrationTier: 'epic',
  },
  {
    name: 'century_club',
    label: 'Century Club',
    description: '100 tasks completed',
    icon: '💯',
    category: 'milestone',
    unlockHint: 'Complete 100 morning tasks.',
    celebrationTier: 'major',
  },
  {
    name: 'execution_machine',
    label: 'Execution Machine',
    description: '500 tasks completed',
    icon: '⚡',
    category: 'milestone',
    unlockHint: 'Complete 500 morning tasks.',
    celebrationTier: 'major',
  },
  {
    name: 'decision_maker',
    label: 'Decision Maker',
    description: '50 decisions logged',
    icon: '🤔',
    category: 'milestone',
    unlockHint: 'Log 50 morning decisions.',
    celebrationTier: 'major',
  },
  {
    name: 'evening_reflector',
    label: 'Evening Reflector',
    description: '30 evening reflections',
    icon: '🌙',
    category: 'milestone',
    unlockHint: 'Complete 30 evening reflections.',
    celebrationTier: 'major',
  },

  // Discovery (all major per spec)
  {
    name: 'founder_story',
    label: 'Founder Story',
    description: 'Profile completed',
    icon: '📖',
    category: 'discovery',
    unlockHint: 'Complete all profile sections.',
    celebrationTier: 'major',
  },
  {
    name: 'guided_founder',
    label: 'Guided Founder',
    description: 'Interactive tour completed',
    icon: '🧭',
    category: 'discovery',
    unlockHint: 'Complete the guided morning tour.',
    celebrationTier: 'major',
  },
  {
    name: 'pattern_hunter',
    label: 'Pattern Hunter',
    description: 'All pattern features unlocked',
    icon: '🔍',
    category: 'discovery',
    unlockHint: 'Unlock all Patterns features.',
    celebrationTier: 'major',
  },
  {
    name: 'rhythm_keeper',
    label: 'Rhythm Keeper',
    description: 'All rhythm features unlocked',
    icon: '🌊',
    category: 'discovery',
    unlockHint: 'Unlock all Rhythm features.',
    celebrationTier: 'major',
  },
  {
    name: 'dna_discovered',
    label: 'DNA Discovered',
    description: 'Full archetype unlocked',
    icon: '🧬',
    category: 'discovery',
    unlockHint: 'Reach full Founder Archetype.',
    celebrationTier: 'epic',
  },

  // Identity (warm modal — archetype signal)
  {
    name: 'visionary',
    label: 'Visionary',
    description: 'Archetype: Visionary',
    icon: '🔭',
    category: 'identity',
    unlockHint: 'Unlock Visionary archetype.',
    celebrationTier: 'major',
  },
  {
    name: 'builder',
    label: 'Builder',
    description: 'Archetype: Builder',
    icon: '🏗️',
    category: 'identity',
    unlockHint: 'Unlock Builder archetype.',
    celebrationTier: 'major',
  },
  {
    name: 'hustler',
    label: 'Hustler',
    description: 'Archetype: Hustler',
    icon: '🚀',
    category: 'identity',
    unlockHint: 'Unlock Hustler archetype.',
    celebrationTier: 'major',
  },
  {
    name: 'strategist',
    label: 'Strategist',
    description: 'Archetype: Strategist',
    icon: '📐',
    category: 'identity',
    unlockHint: 'Unlock Strategist archetype.',
    celebrationTier: 'major',
  },
  {
    name: 'hybrid',
    label: 'Hybrid',
    description: 'Archetype: Mixed',
    icon: '⚡',
    category: 'identity',
    unlockHint: 'Unlock Hybrid archetype.',
    celebrationTier: 'major',
  },

  // Behavior
  {
    name: 'deep_worker',
    label: 'Deep Worker',
    description: '80%+ focus-time tasks for 30 days',
    icon: '🎯',
    category: 'behavior',
    unlockHint: 'Keep 80%+ Milestone tasks over 30 days.',
    celebrationTier: 'major',
  },
  {
    name: 'quick_win_master',
    label: 'Quick Win Master',
    description: '50+ quick-win tasks',
    icon: '⚡',
    category: 'behavior',
    unlockHint: 'Complete 50 Quick Win tasks.',
    celebrationTier: 'major',
  },
  {
    name: 'strategic_mind',
    label: 'Strategic Mind',
    description: '80%+ strategic decisions for 30 days',
    icon: '🎯',
    category: 'behavior',
    unlockHint: 'Keep 80%+ strategic decisions over 30 days.',
    celebrationTier: 'major',
  },
  {
    name: 'tactical_pro',
    label: 'Tactical Pro',
    description: '80%+ tactical decisions for 30 days',
    icon: '⚡',
    category: 'behavior',
    unlockHint: 'Keep 80%+ tactical decisions over 30 days.',
    celebrationTier: 'major',
  },

  // Reflection
  {
    name: 'deep_reflector',
    label: 'Deep Reflector',
    description: '30+ deep evening reflections',
    icon: '🧘',
    category: 'reflection',
    unlockHint: 'Average 50+ words over 30 evening reflections.',
    celebrationTier: 'major',
  },
  {
    name: 'pattern_seeker',
    label: 'Pattern Seeker',
    description: 'Detected 5+ patterns',
    icon: '🔍',
    category: 'reflection',
    unlockHint: 'Surface at least 5 pattern signals.',
    celebrationTier: 'major',
  },
  {
    name: 'question_asker',
    label: 'Question Asker',
    description: 'Recurring question found 3+ times',
    icon: '💫',
    category: 'reflection',
    unlockHint: 'Have the same recurring question 3+ times.',
    celebrationTier: 'major',
  },
  {
    name: 'growth_edge',
    label: 'Growth Edge',
    description: 'Celebration gap hidden win found',
    icon: '🪞',
    category: 'reflection',
    unlockHint: 'Trigger a hidden-win celebration gap insight.',
    celebrationTier: 'major',
  },
]

export const BADGE_DEFINITION_MAP = Object.fromEntries(
  BADGE_DEFINITIONS.map((b) => [b.name, b]),
) as Record<string, BadgeDefinition>

export function getBadgeCelebrationTier(name: string): BadgeCelebrationTier {
  return BADGE_DEFINITION_MAP[name]?.celebrationTier ?? 'minor'
}
