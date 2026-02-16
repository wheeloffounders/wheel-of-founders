import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { subDays, format } from 'date-fns'
import {
  detectBehaviorPatterns,
  detectThemePattern,
  type BehaviorPatternType,
  type ThemePatternType,
} from '@/lib/pattern-detection'

const MIN_DAYS_SINCE_PROMPT = 7

/** GET: Detect behavior or journal-theme patterns. Returns one pattern for adaptive coaching (no feedback form). */
export async function GET() {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ pattern: null })
    }

    const db = getServerSupabase()
    const userId = session.user.id
    const startDate = format(subDays(new Date(), 14), 'yyyy-MM-dd')

    const { data: prefs } = await db
      .from('feedback_trigger_preferences')
      .select('pattern_prompted_at')
      .eq('user_id', userId)
      .maybeSingle()

    const promptedAt = (prefs?.pattern_prompted_at as Record<string, string>) || {}

    const wasShownRecently = (key: string) => {
      const t = promptedAt[key]
      if (!t) return false
      const daysSince = (Date.now() - new Date(t).getTime()) / (24 * 60 * 60 * 1000)
      return daysSince < MIN_DAYS_SINCE_PROMPT
    }

    // Fetch last 14 days: tasks by day (total, completed, withNeedleMover)
    const { data: tasks } = await db
      .from('morning_tasks')
      .select('plan_date, completed, needle_mover')
      .eq('user_id', userId)
      .gte('plan_date', startDate)

    const tasksByDay = new Map<string, { total: number; completed: number; withNeedleMover: number }>()
    for (const t of tasks || []) {
      const date = t.plan_date
      if (!tasksByDay.has(date)) tasksByDay.set(date, { total: 0, completed: 0, withNeedleMover: 0 })
      const row = tasksByDay.get(date)!
      row.total++
      if ((t as { completed?: boolean }).completed) row.completed++
      if ((t as { needle_mover?: boolean | null }).needle_mover === true) row.withNeedleMover++
    }
    const tasksByDayArr = Array.from(tasksByDay.entries())
      .map(([plan_date, v]) => ({ plan_date, ...v }))
      .sort((a, b) => b.plan_date.localeCompare(a.plan_date))

    // Fetch last 14 days: evening reviews (mood, energy)
    const { data: reviews } = await db
      .from('evening_reviews')
      .select('review_date, journal, wins, lessons, mood, energy')
      .eq('user_id', userId)
      .gte('review_date', startDate)
      .order('review_date', { ascending: false })

    const reviewsForThemes = (reviews || []).map((r) => ({
      journal: r.journal,
      wins: r.wins,
      lessons: r.lessons,
    }))
    const reviewsByDay = (reviews || []).map((r) => ({
      review_date: r.review_date,
      mood: r.mood,
      energy: r.energy,
    }))

    // 1. Behavior patterns first (adapt UI / offer simplifications)
    const behavior = detectBehaviorPatterns(tasksByDayArr, reviewsByDay)
    if (behavior && !wasShownRecently(behavior.patternType)) {
      return NextResponse.json({
        pattern: {
          kind: 'behavior',
          patternType: behavior.patternType,
          message: behavior.message,
          suggestedAction: behavior.suggestedAction,
          ctaLabel: behavior.ctaLabel,
        },
      })
    }

    // 2. Journal themes for coaching (personalized tip, no form)
    const theme = detectThemePattern(reviewsForThemes)
    if (theme && !wasShownRecently(theme.patternType)) {
      return NextResponse.json({
        pattern: {
          kind: 'coaching',
          patternType: theme.patternType,
          context: theme.context,
          message: `You've mentioned ${theme.context} a few times. Here's one focused idea: start each day by choosing just one true Needle Mover—something that would change the game if you did it. The rest can wait.`,
          suggestedAction: 'ack_only',
          ctaLabel: 'Got it',
        },
      })
    }

    return NextResponse.json({ pattern: null })
  } catch (err) {
    console.error('[Detect patterns]', err)
    return NextResponse.json({ pattern: null })
  }
}
