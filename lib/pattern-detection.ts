/**
 * Pattern detection for Mrs. Deer: behavior-based + journal themes
 *
 * BEHAVIOR PATTERNS: Where users get stuck (from DB actions)
 * - Used to adapt the experience (simplify UI, offer tips) and for founder analytics
 *
 * JOURNAL THEMES: Recurring words in reflections (for better coaching only)
 * - Used to personalize Mrs. Deer's advice, not to ask for feedback
 */

// ----- Behavior patterns (what users do) -----
export type BehaviorPatternType =
  | 'over_planning'       // Saves plan but completes < 50% tasks, 5+ days
  | 'needle_mover_unused' // No needle_mover tasks in last 7 days
  | 'skips_mood_energy'   // Saves evening but mood/energy null often (5+ of last 7)

export interface BehaviorPattern {
  kind: 'behavior'
  patternType: BehaviorPatternType
  message: string
  /** Suggested UI action, e.g. 'offer_light_mode', 'tip_needle_movers' */
  suggestedAction: string
  /** Optional CTA label */
  ctaLabel?: string
}

// ----- Journal themes (what they write) - for coaching only -----
export type ThemePatternType =
  | 'prioritization'
  | 'overwhelm'
  | 'focus'
  | 'needle_movers'
  | 'disruptions'

export interface ThemePattern {
  kind: 'coaching'
  patternType: ThemePatternType
  context: string
  mentionCount: number
}

export type DetectedPattern = BehaviorPattern | ThemePattern

// ----- Behavior detection -----
const BEHAVIOR_CONFIG: Record<
  BehaviorPatternType,
  { message: string; suggestedAction: string; ctaLabel?: string }
> = {
  over_planning: {
    message: "I notice you're planning more than you complete. Would a simpler planning template help?",
    suggestedAction: 'offer_light_mode',
    ctaLabel: 'Yes, show Light Mode (2 tasks)',
  },
  needle_mover_unused: {
    message: "I notice you haven't been using Needle Movers. They help focus on what matters most—want a quick tip?",
    suggestedAction: 'tip_needle_movers',
    ctaLabel: 'Yes, show tip',
  },
  skips_mood_energy: {
    message: "Mood and energy are optional—skip them anytime if you're in a rush. Your reflection still counts.",
    suggestedAction: 'ack_only',
    ctaLabel: 'Got it',
  },
}

/** Detect behavior patterns from task and review data */
export function detectBehaviorPatterns(
  tasksByDay: Array<{ plan_date: string; total: number; completed: number; withNeedleMover: number }>,
  reviewsByDay: Array<{ review_date: string; mood: number | null; energy: number | null }>
): BehaviorPattern | null {
  const DAYS_LOOKBACK = 7
  const MIN_DAYS_FOR_OVER_PLANNING = 5
  const COMPLETION_THRESHOLD = 0.5

  // over_planning: at least 5 days with a plan where completion rate < 50%
  let overPlanningDays = 0
  for (const day of tasksByDay.slice(0, DAYS_LOOKBACK)) {
    if (day.total >= 1 && day.completed / day.total < COMPLETION_THRESHOLD) overPlanningDays++
  }
  if (overPlanningDays >= MIN_DAYS_FOR_OVER_PLANNING) {
    return {
      kind: 'behavior',
      patternType: 'over_planning',
      ...BEHAVIOR_CONFIG.over_planning,
    }
  }

  // needle_mover_unused: no day in last 7 has any task with needle_mover true
  const anyNeedleMover = tasksByDay.some((d) => d.withNeedleMover > 0)
  if (tasksByDay.length >= 3 && !anyNeedleMover) {
    return {
      kind: 'behavior',
      patternType: 'needle_mover_unused',
      ...BEHAVIOR_CONFIG.needle_mover_unused,
    }
  }

  // skips_mood_energy: most recent 7 reviews, 5+ have mood or energy null
  const recentReviews = reviewsByDay.slice(0, DAYS_LOOKBACK)
  const skippedCount = recentReviews.filter((r) => r.mood == null || r.energy == null).length
  if (recentReviews.length >= 5 && skippedCount >= 5) {
    return {
      kind: 'behavior',
      patternType: 'skips_mood_energy',
      ...BEHAVIOR_CONFIG.skips_mood_energy,
    }
  }

  return null
}

// ----- Journal theme detection (for coaching) -----
const THEME_KEYWORDS: Record<ThemePatternType, string[]> = {
  prioritization: [
    'prioritization', 'priorities', 'prioritize', 'where to start', 'too many tasks',
    "didn't know where to start", 'deciding what to do', 'pick my needle mover', 'unclear on priorities',
    'what to focus on', 'priority',
  ],
  overwhelm: [
    'overwhelmed', 'overwhelm', 'too much', 'drowning', 'swamped', "can't keep up",
    'too many things', 'spread too thin', 'burned out', 'burnout', 'exhausted',
  ],
  focus: [
    'focus', 'distracted', 'concentration', 'attention', 'scattered', 'unfocused',
    'lost focus', 'hard to focus', 'stay focused',
  ],
  needle_movers: [
    'needle mover', 'needle movers', "didn't use needle movers", 'forgot needle movers',
    'no needle movers', 'needle mover tag',
  ],
  disruptions: [
    'emergency', 'emergencies', 'fire', 'fires', 'interruption', 'interruptions',
    'disrupted', 'put out fires',
  ],
}

const THEME_CONTEXT: Record<ThemePatternType, string> = {
  prioritization: 'planning and priorities',
  overwhelm: 'feeling overwhelmed',
  focus: 'focus',
  needle_movers: 'using Needle Movers',
  disruptions: 'disruptions',
}

function getSearchableText(review: { journal?: string | null; wins?: string | null; lessons?: string | null }): string {
  let text = (review.journal || '').toLowerCase()
  if (review.wins) {
    try {
      const wins = typeof review.wins === 'string' ? JSON.parse(review.wins) : review.wins
      text += ' ' + (Array.isArray(wins) ? wins.join(' ') : String(wins)).toLowerCase()
    } catch {
      text += ' ' + String(review.wins).toLowerCase()
    }
  }
  if (review.lessons) {
    try {
      const lessons = typeof review.lessons === 'string' ? JSON.parse(review.lessons) : review.lessons
      text += ' ' + (Array.isArray(lessons) ? lessons.join(' ') : String(lessons)).toLowerCase()
    } catch {
      text += ' ' + String(review.lessons).toLowerCase()
    }
  }
  return text
}

/** Detect journal themes for coaching (personalized advice). Returns first theme with 3+ mentions. */
export function detectThemePattern(
  reviews: Array<{ journal?: string | null; wins?: string | null; lessons?: string | null }>
): ThemePattern | null {
  if (!reviews || reviews.length < 3) return null

  const counts: Record<ThemePatternType, number> = {
    prioritization: 0,
    overwhelm: 0,
    focus: 0,
    needle_movers: 0,
    disruptions: 0,
  }

  for (const review of reviews) {
    const text = getSearchableText(review)
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as [ThemePatternType, string[]][]) {
      if (keywords.some((kw) => text.includes(kw.toLowerCase()))) counts[theme]++
    }
  }

  for (const [theme, count] of Object.entries(counts) as [ThemePatternType, number][]) {
    if (count >= 3) {
      return {
        kind: 'coaching',
        patternType: theme,
        context: THEME_CONTEXT[theme],
        mentionCount: count,
      }
    }
  }
  return null
}
