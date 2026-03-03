import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { isDevelopment, isAdmin } from '@/lib/admin'
import { generateAIPrompt, AIError } from '@/lib/ai-client'
import { checkUserHistory } from '@/lib/user-history'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { detectWinThemes } from '@/lib/weekly-analysis'
import { PARSE_INSTRUCTION } from '@/lib/insight-parse-instructions'
import type { WinWithDate, LessonWithDate } from '@/lib/weekly-analysis'

const MRS_DEER_RULES = `You are Mrs. Deer, a warm, wise coach for founders. You've sat with many founders. You validate before reframing. You think with them, not at them.`

interface GenerateBody {
  monthStart: string
  monthEnd: string
}

function parseWins(val: unknown, date: string): WinWithDate[] {
  const wins: WinWithDate[] = []
  if (!val) return wins
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        parsed.filter((s: string) => s?.trim()).forEach((s: string) => wins.push({ text: s, date }))
      } else if (typeof parsed === 'string' && parsed.trim()) {
        wins.push({ text: parsed, date })
      }
    } catch {
      if (val.trim()) wins.push({ text: val, date })
    }
  }
  return wins
}

function parseLessons(val: unknown, date: string): LessonWithDate[] {
  const lessons: LessonWithDate[] = []
  if (!val) return lessons
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        parsed.filter((s: string) => s?.trim()).forEach((s: string) => lessons.push({ text: s, date }))
      } else if (typeof parsed === 'string' && parsed.trim()) {
        lessons.push({ text: parsed, date })
      }
    } catch {
      if (val.trim()) lessons.push({ text: val, date })
    }
  }
  return lessons
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    return withRateLimit(req, 'monthly', async (req) => {
      const session = await getServerSessionFromRequest(req)
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (!isDevelopment() && !(await isAdmin(session.user.id))) {
        console.warn('[monthly-insight] Generate called in production by non-admin:', session.user.id)
        return NextResponse.json({ error: 'On-demand generation is disabled in production. Insights are pre-generated monthly.' }, { status: 403 })
      }

      const body = (await req.json()) as GenerateBody
    const { monthStart, monthEnd } = body

    if (!monthStart || !monthEnd) {
      return NextResponse.json({ error: 'monthStart and monthEnd required' }, { status: 400 })
    }

    const db = getServerSupabase()

    // Get all weeks that overlap the month
    const monthStartDate = new Date(monthStart)
    const monthEndDate = new Date(monthEnd)
    const weekStarts: string[] = []
    let d = startOfWeek(monthStartDate, { weekStartsOn: 1 })
    while (d <= monthEndDate) {
      const weekStartStr = d.toISOString().slice(0, 10)
      weekStarts.push(weekStartStr)
      d = addDays(d, 7)
    }

    // Fetch reviews for the month
    const { data: reviews } = await db
      .from('evening_reviews')
      .select('review_date, wins, lessons, mood, energy')
      .eq('user_id', session.user.id)
      .gte('review_date', monthStart)
      .lte('review_date', monthEnd)
      .order('review_date', { ascending: true })

    // Fetch weekly selections for all weeks in the month
    const { data: selectionsData } = await (db.from('weekly_insight_selections') as any)
      .select('week_start_date, favorite_win_indices, key_lesson_indices')
      .eq('user_id', session.user.id)
      .in('week_start_date', weekStarts)

    const selectionsByWeek = new Map<string | undefined, { favorite_win_indices: number[]; key_lesson_indices: number[] }>()
    ;(selectionsData ?? []).forEach((s: { week_start_date?: string; favorite_win_indices?: number[]; key_lesson_indices?: number[] }) => {
      selectionsByWeek.set(s.week_start_date, {
        favorite_win_indices: s.favorite_win_indices ?? [],
        key_lesson_indices: s.key_lesson_indices ?? [],
      })
    })

    // Aggregate wins, lessons by week (in date order for correct index mapping)
    const winsWithDate: WinWithDate[] = []
    const lessonsWithDate: LessonWithDate[] = []
    const starredWins: string[] = []
    const keyLessons: string[] = []
    const moods: number[] = []
    const energies: number[] = []

    const reviewsByWeek = new Map<string, { wins: string[]; lessons: string[] }>()
    for (const r of (reviews ?? []).sort((a, b) => ((a as { review_date?: string }).review_date || '').localeCompare((b as { review_date?: string }).review_date || ''))) {
      const date = (r as { review_date?: string }).review_date || ''
      const weekStart = weekStarts.find((ws) => {
        const wsDate = new Date(ws)
        const weekEnd = endOfWeek(wsDate, { weekStartsOn: 1 })
        const reviewDate = new Date(date)
        return reviewDate >= wsDate && reviewDate <= weekEnd
      })
      const w = parseWins((r as { wins?: unknown }).wins, date)
      const l = parseLessons((r as { lessons?: unknown }).lessons, date)
      const winTexts = w.map((x) => x.text)
      const lessonTexts = l.map((x) => x.text)
      winsWithDate.push(...w)
      lessonsWithDate.push(...l)
      const m = (r as { mood?: number }).mood
      const e = (r as { energy?: number }).energy
      if (typeof m === 'number') moods.push(m)
      if (typeof e === 'number') energies.push(e)

      if (weekStart) {
        const existing = reviewsByWeek.get(weekStart) ?? { wins: [], lessons: [] }
        existing.wins.push(...winTexts)
        existing.lessons.push(...lessonTexts)
        reviewsByWeek.set(weekStart, existing)
      }
    }

    // Apply starred/keyed from selections (indices refer to week's combined wins/lessons)
    for (const [weekStart, sel] of selectionsByWeek) {
      if (!weekStart) continue
      const weekData = reviewsByWeek.get(weekStart)
      if (!weekData) continue
      const { wins: weekWins, lessons: weekLessons } = weekData
      for (const i of sel.favorite_win_indices) {
        if (weekWins[i]) starredWins.push(weekWins[i])
      }
      for (const i of sel.key_lesson_indices) {
        if (weekLessons[i]) keyLessons.push(weekLessons[i])
      }
    }

    // Monthly totals
    const [tasksRes, decisionsRes, profileRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('needle_mover, completed')
        .eq('user_id', session.user.id)
        .gte('plan_date', monthStart)
        .lte('plan_date', monthEnd),
      db
        .from('morning_decisions')
        .select('id')
        .eq('user_id', session.user.id)
        .gte('plan_date', monthStart)
        .lte('plan_date', monthEnd),
      db.from('user_profiles').select('primary_goal_text').eq('id', session.user.id).maybeSingle(),
    ])

    const tasks = (tasksRes.data ?? []) as any[]
    const needleMoversTotal = tasks.filter((t) => t.needle_mover).length
    const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.completed).length
    const decisions = decisionsRes.data?.length ?? 0
    const primaryGoal = (profileRes.data as { primary_goal_text?: string } | null)?.primary_goal_text ?? null

    const topThemes = detectWinThemes(winsWithDate).slice(0, 3)
    const avgMood = moods.length > 0 ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10 : null
    const avgEnergy = energies.length > 0 ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10 : null

    const winsBlock = winsWithDate.length > 0
      ? winsWithDate
          .map((w) => `- ${w.text}`)
          .join('\n')
      : '(none recorded)'

    const lessonsBlock = lessonsWithDate.length > 0
      ? lessonsWithDate
          .map((l) => `- ${l.text}`)
          .join('\n')
      : '(none recorded)'

    const starredBlock = starredWins.length > 0
      ? `\n\nSTARRED WINS (they found meaning in these):\n${starredWins.map((w) => `- ${w}`).join('\n')}`
      : ''

    const keyLessonsBlock = keyLessons.length > 0
      ? `\n\nKEY LESSONS (they marked these as important):\n${keyLessons.map((l) => `- ${l}`).join('\n')}`
      : ''

    const userPrompt = `You are Mrs. Deer, a warm, wise coach for founders.

This user had the following month (${monthStart} to ${monthEnd}):

GOAL: ${primaryGoal || '(not set)'}

ALL WINS (${winsWithDate.length} total):
${winsBlock}

ALL LESSONS (${lessonsWithDate.length} total):
${lessonsBlock}
${starredBlock}
${keyLessonsBlock}

MOOD AVERAGE: ${avgMood ?? '—'}/5
ENERGY AVERAGE: ${avgEnergy ?? '—'}/5
SESSIONS (evening reviews): ${reviews?.length ?? 0}
TASKS COMPLETED: ${completedTasks}/${totalTasks}
NEEDLE MOVERS: ${needleMoversCompleted}/${needleMoversTotal}
DECISIONS: ${decisions}

TOP THEMES FROM WINS: ${topThemes.map((t) => t.theme).join(', ') || '(none)'}

${PARSE_INSTRUCTION}

Please generate a monthly reflection with 6-8 sections. Give each idea room to land. A month of life deserves more than a few sentences per section. Parse multi-thought entries into themes and track evolution within each theme across weeks.

Suggested structure (let AI choose natural titles and adapt based on content):

1. THE SHAPE OF YOUR [MONTH] - 3-4 sentences on the overall arc. What themes dominated? How did energy/mood shift? Major wins.

2. YOUR WINS, UNPACKED - 4-5 sentences on what their starred wins reveal. What truly matters to them? What story do these moments tell?

3. THE LESSONS THAT ECHO - 4-5 sentences on recurring themes in their lessons. What keeps showing up? What are they learning about themselves?

4. A DEEPER LOOK: [THEME] - 4-5 sentences on one pattern you noticed (e.g., the work/family dance, the discipline/patience tension). Go deeper on one thread.

5. WHERE THEY'VE GROWN - 3-4 sentences on subtle shifts from week 1 to week 4. What's different now? What have they traded for something better?

6. A QUESTION TO SIT WITH - 2-3 sentences. A gentle, open question to carry forward. Make it specific to their journey.

OUTPUT FORMAT: Use markdown ## headers for section titles. Structure as 6-8 sections with blank lines between each. Let the AI choose warm, natural titles (e.g. "The Shape of Your January", "What Your Wins Whisper", "The Lesson That Keeps Echoing", "The Quiet Evolution", "A Question to Carry Forward"). Each section should feel like its own reflection—no cramming multiple ideas into one paragraph. Use their words. Be specific. Let each idea breathe.`

    const { hasHistory } = await checkUserHistory(session.user.id)
    console.log(`[monthly-insight] User hasHistory=${hasHistory}, template=${hasHistory ? 'pattern' : 'mirror'}`)

    const historyNote = hasHistory ? '' : ' CRITICAL: User has NO prior history. ONLY use what they wrote this month. DO NOT say "I recall" or invent context. Be a mirror, not a coach.'
    const systemPrompt = `${MRS_DEER_RULES}

Monthly insight: max 800 words. Output 6-8 sections with ## markdown headers and blank lines between each section. Give each section room to breathe—3-5 sentences per section. Let AI choose warm, natural titles. Each section should feel like its own reflection. BANNED: needle mover, action plan, smart constraint, power list. Use natural language only.${historyNote}`

    const insight = await generateAIPrompt({
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Save to personal_prompts
    const { error: insertError } = await (db.from('personal_prompts') as any).insert({
      user_id: session.user.id,
      prompt_text: insight,
      prompt_type: 'monthly',
      prompt_date: monthStart,
      stage_context: null,
      generation_count: 1,
    })

    if (insertError) {
      console.error('[monthly-insight] Failed to save:', insertError)
    }

    // Save to insight_history for revisiting
    await (db.from('insight_history') as any).upsert(
      {
        user_id: session.user.id,
        insight_type: 'monthly',
        period_start: monthStart,
        period_end: monthEnd,
        insight_text: insight,
      },
      { onConflict: 'user_id,insight_type,period_start,period_end' }
    )

    return NextResponse.json({
      prompt: insight,
      monthStart,
      monthEnd,
      stats: {
        sessions: reviews?.length ?? 0,
        needleMoversCompleted,
        needleMoversTotal,
        topThemes: topThemes.map((t) => t.theme),
        avgMood,
        avgEnergy,
      },
    })
    })
  } catch (error) {
    console.error('[monthly-insight] Error:', error)
    if (error instanceof AIError) {
      return NextResponse.json(
        {
          error: error.message,
          aiError: true,
          model: error.model,
          status: error.status,
          statusText: error.statusText,
          openRouterError: error.openRouterError,
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate monthly insight' },
      { status: 500 }
    )
  }
}
