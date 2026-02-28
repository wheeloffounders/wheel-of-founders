/**
 * Batch monthly insight generation for cron jobs.
 */
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'
import { checkUserHistory } from '@/lib/user-history'
import { detectWinThemes } from '@/lib/weekly-analysis'
import { PARSE_INSTRUCTION } from '@/lib/insight-parse-instructions'
import type { WinWithDate, LessonWithDate } from '@/lib/weekly-analysis'

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

export async function generateMonthlyInsightForUser(
  userId: string,
  monthStart: string,
  monthEnd: string
): Promise<{ success: boolean; insight?: string; error?: string }> {
  const db = getServerSupabase()

  const monthStartDate = new Date(monthStart)
  const monthEndDate = new Date(monthEnd)
  const weekStarts: string[] = []
  let d = startOfWeek(monthStartDate, { weekStartsOn: 1 })
  while (d <= monthEndDate) {
    weekStarts.push(d.toISOString().slice(0, 10))
    d = addDays(d, 7)
  }

  const [reviewsRes, selectionsRes, tasksRes, decisionsRes, profileRes] = await Promise.all([
    db.from('evening_reviews').select('review_date, wins, lessons, mood, energy').eq('user_id', userId).gte('review_date', monthStart).lte('review_date', monthEnd).order('review_date', { ascending: true }),
    (db.from('weekly_insight_selections') as any).select('week_start_date, favorite_win_indices, key_lesson_indices').eq('user_id', userId).in('week_start_date', weekStarts),
    db.from('morning_tasks').select('needle_mover, completed').eq('user_id', userId).gte('plan_date', monthStart).lte('plan_date', monthEnd),
    db.from('morning_decisions').select('id').eq('user_id', userId).gte('plan_date', monthStart).lte('plan_date', monthEnd),
    db.from('user_profiles').select('primary_goal_text').eq('id', userId).maybeSingle(),
  ])

  const reviews = (reviewsRes.data ?? []) as { review_date?: string; wins?: unknown; lessons?: unknown; mood?: number; energy?: number }[]
  const selectionsData = (selectionsRes.data ?? []) as { week_start_date?: string; favorite_win_indices?: number[]; key_lesson_indices?: number[] }[]
  const tasks = (tasksRes.data ?? []) as { needle_mover?: boolean; completed?: boolean }[]
  const primaryGoal = (profileRes.data as { primary_goal_text?: string } | null)?.primary_goal_text ?? null

  const selectionsByWeek = new Map<string, { favorite_win_indices: number[]; key_lesson_indices: number[] }>()
  selectionsData.forEach((s) => {
    if (s.week_start_date) selectionsByWeek.set(s.week_start_date, { favorite_win_indices: s.favorite_win_indices ?? [], key_lesson_indices: s.key_lesson_indices ?? [] })
  })

  const winsWithDate: WinWithDate[] = []
  const lessonsWithDate: LessonWithDate[] = []
  const starredWins: string[] = []
  const keyLessons: string[] = []
  const moods: number[] = []
  const energies: number[] = []
  const reviewsByWeek = new Map<string, { wins: string[]; lessons: string[] }>()

  for (const r of reviews.sort((a, b) => (a.review_date || '').localeCompare(b.review_date || ''))) {
    const date = r.review_date || ''
    const weekStart = weekStarts.find((ws) => {
      const wsDate = new Date(ws)
      const weekEndDate = endOfWeek(wsDate, { weekStartsOn: 1 })
      const reviewDate = new Date(date)
      return reviewDate >= wsDate && reviewDate <= weekEndDate
    })
    const w = parseWins(r.wins, date)
    const l = parseLessons(r.lessons, date)
    winsWithDate.push(...w)
    lessonsWithDate.push(...l)
    if (typeof r.mood === 'number') moods.push(r.mood)
    if (typeof r.energy === 'number') energies.push(r.energy)
    if (weekStart) {
      const existing = reviewsByWeek.get(weekStart) ?? { wins: [], lessons: [] }
      existing.wins.push(...w.map((x) => x.text))
      existing.lessons.push(...l.map((x) => x.text))
      reviewsByWeek.set(weekStart, existing)
    }
  }

  for (const [weekStart, sel] of selectionsByWeek) {
    const weekData = reviewsByWeek.get(weekStart)
    if (!weekData) continue
    for (const i of sel.favorite_win_indices) {
      if (weekData.wins[i]) starredWins.push(weekData.wins[i])
    }
    for (const i of sel.key_lesson_indices) {
      if (weekData.lessons[i]) keyLessons.push(weekData.lessons[i])
    }
  }

  const needleMoversTotal = tasks.filter((t) => t.needle_mover).length
  const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length
  const decisions = (decisionsRes.data ?? []).length
  const topThemes = detectWinThemes(winsWithDate).slice(0, 3)
  const avgMood = moods.length > 0 ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10 : null
  const avgEnergy = energies.length > 0 ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10 : null

  if (winsWithDate.length === 0 && lessonsWithDate.length === 0) {
    return { success: false, error: 'No wins or lessons for month' }
  }

  const winsBlock = winsWithDate.length > 0 ? winsWithDate.map((w) => `- ${w.text}`).join('\n') : '(none recorded)'
  const lessonsBlock = lessonsWithDate.length > 0 ? lessonsWithDate.map((l) => `- ${l.text}`).join('\n') : '(none recorded)'
  const starredBlock = starredWins.length > 0 ? `\n\nSTARRED WINS (they found meaning in these):\n${starredWins.map((w) => `- ${w}`).join('\n')}` : ''
  const keyLessonsBlock = keyLessons.length > 0 ? `\n\nKEY LESSONS (they marked these as important):\n${keyLessons.map((l) => `- ${l}`).join('\n')}` : ''

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
SESSIONS (evening reviews): ${reviews.length}
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

4. A DEEPER LOOK: [THEME] - 4-5 sentences on one pattern you noticed. Go deeper on one thread.

5. WHERE THEY'VE GROWN - 3-4 sentences on subtle shifts from week 1 to week 4. What's different now?

6. A QUESTION TO SIT WITH - 2-3 sentences. A gentle, open question to carry forward. Make it specific to their journey.

OUTPUT FORMAT: Use markdown ## headers for section titles. Structure as 6-8 sections with blank lines between each. Let the AI choose warm, natural titles. Use their words. Be specific. Let each idea breathe.`

  const { hasHistory } = await checkUserHistory(userId)
  const MRS_DEER_RULES = `You are Mrs. Deer, a warm, wise coach for founders. You've sat with many founders. You validate before reframing. You think with them, not at them.`
  const historyNote = hasHistory ? '' : ' CRITICAL: User has NO prior history. ONLY use what they wrote this month. DO NOT say "I recall" or invent context. Be a mirror, not a coach.'

  try {
    const insight = await generateAIPrompt({
      systemPrompt: `${MRS_DEER_RULES}\n\nMonthly insight: max 800 words. Output 6-8 sections with ## markdown headers. BANNED: needle mover, action plan, smart constraint, power list.${historyNote}`,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    await (db.from('personal_prompts') as any).insert({
      user_id: userId,
      prompt_text: insight,
      prompt_type: 'monthly',
      prompt_date: monthStart,
      stage_context: null,
      generation_count: 1,
    })

    await (db.from('insight_history') as any).upsert(
      { user_id: userId, insight_type: 'monthly', period_start: monthStart, period_end: monthEnd, insight_text: insight },
      { onConflict: 'user_id,insight_type,period_start,period_end' }
    )

    return { success: true, insight }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
