/**
 * Batch quarterly insight generation for cron jobs.
 */
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'
import { checkUserHistory } from '@/lib/user-history'
import { detectWinThemes } from '@/lib/weekly-analysis'
import { PARSE_INSTRUCTION } from '@/lib/insight-parse-instructions'
import type { WinWithDate } from '@/lib/weekly-analysis'

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

function parseLessons(val: unknown): string[] {
  if (!val) return []
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed.filter((s: string) => s?.trim()) : parsed && typeof parsed === 'string' ? [parsed] : []
    } catch {
      return val.trim() ? [val] : []
    }
  }
  return []
}

export async function generateQuarterlyInsightForUser(
  userId: string,
  quarterStart: string,
  quarterEnd: string
): Promise<{ success: boolean; insight?: string; error?: string }> {
  const db = getServerSupabase()

  const quarterStartDate = new Date(quarterStart)
  const months: { start: string; end: string; label: string }[] = []
  for (let i = 0; i < 3; i++) {
    const m = addMonths(quarterStartDate, i)
    months.push({
      start: format(startOfMonth(m), 'yyyy-MM-dd'),
      end: format(endOfMonth(m), 'yyyy-MM-dd'),
      label: m.toLocaleString('default', { month: 'long', year: 'numeric' }),
    })
  }

  const [reviewsRes, tasksRes, profileRes] = await Promise.all([
    db.from('evening_reviews').select('review_date, wins, lessons, mood, energy').eq('user_id', userId).gte('review_date', quarterStart).lte('review_date', quarterEnd).order('review_date', { ascending: true }),
    db.from('morning_tasks').select('needle_mover, completed').eq('user_id', userId).gte('plan_date', quarterStart).lte('plan_date', quarterEnd),
    db.from('user_profiles').select('primary_goal_text').eq('id', userId).maybeSingle(),
  ])

  const reviews = (reviewsRes.data ?? []) as { review_date?: string; wins?: unknown; lessons?: unknown; mood?: number; energy?: number }[]
  const tasks = (tasksRes.data ?? []) as { needle_mover?: boolean; completed?: boolean }[]
  const primaryGoal = (profileRes.data as { primary_goal_text?: string } | null)?.primary_goal_text ?? null

  const winsWithDate: WinWithDate[] = []
  const lessonsByMonth: Record<string, string[]> = {}
  const winsByMonth: Record<string, string[]> = {}
  const moods: number[] = []
  const energies: number[] = []

  for (const r of reviews) {
    const date = r.review_date || ''
    const monthKey = date.slice(0, 7)
    if (!lessonsByMonth[monthKey]) lessonsByMonth[monthKey] = []
    if (!winsByMonth[monthKey]) winsByMonth[monthKey] = []
    const w = parseWins(r.wins, date)
    const l = parseLessons(r.lessons)
    winsWithDate.push(...w)
    lessonsByMonth[monthKey].push(...l)
    winsByMonth[monthKey].push(...w.map((x) => x.text))
    if (typeof r.mood === 'number') moods.push(r.mood)
    if (typeof r.energy === 'number') energies.push(r.energy)
  }

  const needleMoversTotal = tasks.filter((t) => t.needle_mover).length
  const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length
  const topThemes = detectWinThemes(winsWithDate).slice(0, 5)
  const avgMood = moods.length > 0 ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10 : null
  const avgEnergy = energies.length > 0 ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10 : null

  if (winsWithDate.length === 0 && Object.values(lessonsByMonth).every((a) => a.length === 0)) {
    return { success: false, error: 'No wins or lessons for quarter' }
  }

  const monthSummaries = months
    .map((m) => {
      const wins = winsByMonth[m.start.slice(0, 7)] ?? []
      const lessons = lessonsByMonth[m.start.slice(0, 7)] ?? []
      return `${m.label}: Wins (${wins.length}): ${wins.slice(0, 5).join('; ') || '—'} | Lessons (${lessons.length}): ${lessons.slice(0, 5).join('; ') || '—'}`
    })
    .join('\n')

  const userPrompt = `You are Mrs. Deer, a warm, wise coach for founders.

This user had the following quarter (${quarterStart} to ${quarterEnd}):

GOAL: ${primaryGoal || '(not set)'}

BY MONTH:
${monthSummaries}

TOP THEMES: ${topThemes.map((t) => t.theme).join(', ') || '(none)'}
MOOD AVERAGE: ${avgMood ?? '—'}/5
ENERGY AVERAGE: ${avgEnergy ?? '—'}/5
NEEDLE MOVERS: ${needleMoversCompleted}/${needleMoversTotal}
SESSIONS: ${reviews.length}

${PARSE_INSTRUCTION}

CORE PHILOSOPHY: Quarterly is not "more data"—it's "what does this all mean?" and "where are we going?" Look for the throughline, not the details. Find ONE transformation that matters most. Make it feel like a milestone, not another report.

Generate a quarterly reflection with exactly 4 sections:

1. THE QUARTER IN ONE GLANCE - A single, powerful paragraph capturing the essence. The throughline. What was the thread from 12 weeks ago to now?

2. YOUR NORTH STAR - Connect everything back to their main goal. What did they build this quarter? How does it move them toward their goal? Prove it can be done YOUR way.

3. THE BIG SHIFT - ONE major transformation. Not multiple themes—the single biggest shift. What changed? Show the evolution with 2-3 examples across the months.

4. WHAT'S NEXT? - Strategic guidance for the next quarter. Not tactical advice—direction. What's the next 90-day experiment? One big question to carry forward.

OUTPUT FORMAT: Use markdown ## headers. Exactly 4 sections with blank lines between. Let AI choose warm, natural titles. Use their words. Strategic, not tactical. Milestone feeling.`

  const { hasHistory } = await checkUserHistory(userId)
  const MRS_DEER_RULES = `You are Mrs. Deer, a warm, wise coach for founders. You've sat with many founders. You validate before reframing. You think with them, not at them.`
  const historyNote = hasHistory ? '' : ' CRITICAL: User has NO prior history. ONLY use what they wrote this quarter. DO NOT say "I recall" or invent context. Be a mirror, not a coach.'

  try {
    const insight = await generateAIPrompt({
      systemPrompt: `${MRS_DEER_RULES}\n\nQuarterly insight: max 550 words. BIG PICTURE focus. Output exactly 4 sections with ## markdown headers. Find the throughline and ONE big shift. BANNED: needle mover, action plan, smart constraint, power list. Make it feel like a milestone.${historyNote}`,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    await (db.from('personal_prompts') as any).insert({
      user_id: userId,
      prompt_text: insight,
      prompt_type: 'quarterly',
      prompt_date: quarterStart,
      stage_context: null,
      generation_count: 1,
    })

    await (db.from('insight_history') as any).upsert(
      { user_id: userId, insight_type: 'quarterly', period_start: quarterStart, period_end: quarterEnd, insight_text: insight },
      { onConflict: 'user_id,insight_type,period_start,period_end' }
    )

    return { success: true, insight }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
