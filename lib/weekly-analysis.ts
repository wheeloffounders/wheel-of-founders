/**
 * Weekly analysis: theme detection from wins, pattern detection from lessons,
 * mood/energy correlation, and Mrs. Deer insight generation.
 */

export interface WinWithDate {
  text: string
  date: string
}

export interface LessonWithDate {
  text: string
  date: string
}

export interface DayData {
  date: string
  needleMovers: number
  needleMoversCompleted: number
  mood: number | null
  energy: number | null
  wins: string[]
  lessons: string[]
  eveningInsight: string | null
}

/** Keyword groups for win theme detection */
const WIN_THEME_KEYWORDS: Record<string, string[]> = {
  Family: ['son', 'daughter', 'husband', 'wife', 'kids', 'child', 'family', 'breakfast', 'date', 'dinner', 'weekend', 'smile', 'hug'],
  'App / Product': ['app', 'code', 'product', 'feature', 'launch', 'shipped', 'deployed', 'profile', 'prettier'],
  Community: ['reddit', 'twitter', 'outreach', 'followers', 'comments', 'engagement', 'community'],
  Health: ['exercise', 'sleep', 'run', 'workout', 'meditation', 'yoga', 'walk'],
  Work: ['meeting', 'client', 'deal', 'revenue', 'sales', 'pitch'],
  Learning: ['learned', 'read', 'course', 'book', 'podcast'],
}

/** Keyword groups for lesson pattern detection */
const LESSON_PATTERN_KEYWORDS: Record<string, string[]> = {
  'Child discipline': ['yell', 'discipline', 'child', 'son', 'daughter', 'patience', 'tantrum'],
  'Work environment': ['focus', 'distraction', 'office', 'remote', 'environment'],
  Planning: ['plan', 'prioritize', 'overwhelm', 'scattered'],
  'Self-care': ['body', 'tired', 'rest', 'stop', 'boundaries', 'burnout'],
  Communication: ['communicate', 'feedback', 'listen', 'say'],
}

export function detectWinThemes(wins: WinWithDate[]): { theme: string; count: number; examples: string[] }[] {
  const themeCounts: Record<string, { count: number; examples: string[] }> = {}

  for (const { text } of wins) {
    const lower = text.toLowerCase()
    for (const [theme, keywords] of Object.entries(WIN_THEME_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        if (!themeCounts[theme]) themeCounts[theme] = { count: 0, examples: [] }
        themeCounts[theme].count++
        if (themeCounts[theme].examples.length < 2) {
          themeCounts[theme].examples.push(text.length > 60 ? text.slice(0, 57) + '...' : text)
        }
        break
      }
    }
  }

  return Object.entries(themeCounts)
    .filter(([, v]) => v.count >= 1)
    .map(([theme, v]) => ({ theme, count: v.count, examples: v.examples }))
    .sort((a, b) => b.count - a.count)
}

export function detectLessonPatterns(lessons: LessonWithDate[]): { challenge: string; frequency: number }[] {
  const patternCounts: Record<string, number> = {}

  for (const { text } of lessons) {
    const lower = text.toLowerCase()
    for (const [pattern, keywords] of Object.entries(LESSON_PATTERN_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1
        break
      }
    }
  }

  return Object.entries(patternCounts)
    .filter(([, count]) => count >= 1)
    .map(([challenge, frequency]) => ({ challenge, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
}

export function getBestDays(days: DayData[], minNeedleMovers: number, minMood: number): string[] {
  return days
    .filter((d) => d.needleMoversCompleted >= minNeedleMovers && (d.mood ?? 0) >= minMood)
    .map((d) => d.date)
}

export function getPaceAssessment(
  needleMoversCompleted: number,
  needleMoversTotal: number,
  daysCompleted: number,
  daysInWeek: number
): string {
  if (needleMoversTotal === 0) return 'No needle movers planned yet'
  const pct = needleMoversCompleted / needleMoversTotal
  const expectedPct = daysCompleted / daysInWeek
  if (pct >= expectedPct + 0.1) return 'Ahead of target'
  if (pct >= expectedPct - 0.1) return 'On track'
  if (pct >= expectedPct - 0.2) return 'Slightly behind target'
  return 'Behind target'
}

export function generateProgressInsight(
  needleMoversCompleted: number,
  needleMoversTotal: number,
  bestDay: string | null
): string {
  const remaining = needleMoversTotal - needleMoversCompleted
  let insight = `You've completed ${needleMoversCompleted} needle mover${needleMoversCompleted === 1 ? '' : 's'}.`
  if (remaining > 0) {
    insight += ` The ones left are often the hardest—that's not failure, that's focus.`
  }
  if (bestDay) {
    insight += ` Your best day so far was ${bestDay}.`
  }
  insight += ` What's one you could tackle tomorrow?`
  return insight
}

export function generateWinThemeInsight(
  topTheme: { theme: string; count: number; examples: string[] } | null
): string {
  if (!topTheme) return ''
  const { theme, count, examples } = topTheme
  let insight = `You celebrated ${theme.toLowerCase()} ${count} times this week.`
  if (theme === 'Family') {
    insight += ` That's not distraction. That's what you're building for. The app progress is real, but the moments with your family? Those are the needle movers that don't show up in your task list.`
  } else {
    insight += ` That's where your energy went—and it shows.`
  }
  return insight
}

export function generateLessonPatternInsight(
  topPattern: { challenge: string; frequency: number } | null
): string {
  if (!topPattern) return ''
  const { challenge, frequency } = topPattern
  let insight = `${challenge} shows up in your lessons ${frequency} time${frequency === 1 ? '' : 's'} this week.`
  insight += ` That's not failure—that's data. Next week, let's experiment with one small change: when you feel the urge, take 3 breaths first. Just one shift.`
  return insight
}

export function generateActionMixInsight(
  myZoneCount: number,
  systemizeCount: number,
  totalTasks: number
): string {
  if (totalTasks === 0) return ''
  const myZonePct = Math.round((myZoneCount / totalTasks) * 100)
  let insight = `You're deep in execution mode (${myZonePct}% My Zone). That's where progress happens.`
  if (systemizeCount < totalTasks * 0.2) {
    insight += ` But systemizing helps you scale. Next week, try turning one repeated task into a system.`
  }
  return insight
}

export function generateCelebrationQuote(wins: string[], lessons: string[]): string {
  if (wins.length === 0 && lessons.length === 0) {
    return 'Another week of showing up. That matters.'
  }
  const parts: string[] = []
  if (wins.length > 0) {
    parts.push(`${wins.length} win${wins.length === 1 ? '' : 's'} captured`)
  }
  if (lessons.length > 0) {
    parts.push(`${lessons.length} lesson${lessons.length === 1 ? '' : 's'} learned`)
  }
  if (parts.length === 0) return 'This week you showed up. That\'s the foundation.'
  return parts.join(', ') + '. Let\'s look at the patterns.'
}

/** Legacy before/after style quote (used for monthly transformation pairs) */
export function generateTransformationStyleQuote(wins: string[], lessons: string[]): string {
  if (wins.length === 0 && lessons.length === 0) return 'Another week of showing up. That matters.'
  const parts: string[] = []
  if (wins.length > 0) {
    const firstWin = wins[0].length > 60 ? wins[0].slice(0, 57) + '...' : wins[0]
    parts.push(`From scattered focus to "${firstWin}"`)
  }
  if (lessons.length > 0) {
    const firstLesson = lessons[0].length > 50 ? lessons[0].slice(0, 47) + '...' : lessons[0]
    parts.push(`From repeating patterns to noticing "${firstLesson}"`)
  }
  return parts.join('. ') + '. This is growth in action.'
}

export function generateTransformationPairs(
  wins: string[],
  lessons: string[]
): { start: string; now: string }[] {
  const pairs: { start: string; now: string }[] = []
  for (let i = 0; i < Math.min(3, wins.length); i++) {
    const win = wins[i]
    const lesson = lessons[i]
    pairs.push({
      start: lesson ? (lesson.length > 80 ? lesson.slice(0, 77) + '...' : lesson) : 'Working through it',
      now: win.length > 80 ? win.slice(0, 77) + '...' : win,
    })
  }
  return pairs
}

/** Topic keywords for pattern detection (combined from wins + lessons) */
const PATTERN_TOPIC_KEYWORDS: Record<string, string[]> = {
  'your son': ['son', 'boy'],
  'your daughter': ['daughter', 'girl'],
  'your child': ['child', 'kids', 'children'],
  'family': ['family', 'husband', 'wife', 'spouse', 'partner'],
  'Reddit': ['reddit', 'subreddit'],
  'Twitter': ['twitter', 'followers', 'tweet'],
  'your app': ['app', 'product', 'feature', 'launch'],
  'discipline': ['discipline', 'yell', 'tantrum', 'patience'],
  'work environment': ['focus', 'distraction', 'office', 'remote'],
  'planning': ['plan', 'prioritize', 'overwhelm'],
  'self-care': ['body', 'tired', 'rest', 'stop', 'boundaries'],
}

export interface PatternForQuestion {
  topic: string
  count: number
  example: string
  date: string
}

export function detectPatternForQuestion(
  winsWithDate: WinWithDate[],
  lessonsWithDate: LessonWithDate[]
): PatternForQuestion | null {
  const combined: { text: string; date: string }[] = [
    ...winsWithDate.map((w) => ({ text: w.text, date: w.date })),
    ...lessonsWithDate.map((l) => ({ text: l.text, date: l.date })),
  ]
  if (combined.length === 0) return null

  const topicCounts: Record<string, { count: number; example: string; date: string }> = {}

  for (const { text, date } of combined) {
    const lower = text.toLowerCase()
    for (const [topic, keywords] of Object.entries(PATTERN_TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        if (!topicCounts[topic]) topicCounts[topic] = { count: 0, example: '', date: '' }
        topicCounts[topic].count++
        if (!topicCounts[topic].example || text.length < topicCounts[topic].example.length) {
          topicCounts[topic].example = text.length > 120 ? text.slice(0, 117) + '...' : text
          topicCounts[topic].date = date
        }
        break
      }
    }
  }

  const sorted = Object.entries(topicCounts)
    .filter(([, v]) => v.count >= 2)
    .sort(([, a], [, b]) => b.count - a.count)

  const top = sorted[0]
  if (!top) return null
  const [topic, { count, example, date }] = top
  return { topic, count, example, date }
}

/** All topics with counts for visualization (count >= 1) */
export interface TopicCount {
  topic: string
  count: number
}

export function detectAllTopicPatterns(
  winsWithDate: WinWithDate[],
  lessonsWithDate: LessonWithDate[]
): TopicCount[] {
  const combined: { text: string }[] = [
    ...winsWithDate.map((w) => ({ text: w.text })),
    ...lessonsWithDate.map((l) => ({ text: l.text })),
  ]
  if (combined.length === 0) return []

  const topicCounts: Record<string, number> = {}

  for (const { text } of combined) {
    const lower = text.toLowerCase()
    for (const [topic, keywords] of Object.entries(PATTERN_TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1
        break
      }
    }
  }

  return Object.entries(topicCounts)
    .filter(([, count]) => count >= 1)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
}
