/**
 * Search User: Full user history API (dev-only).
 * Returns data in a chronological daily structure.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireDevOnly } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

async function safeQuery<T>(
  fn: () => Promise<{ data: T[] | null }>
): Promise<T[]> {
  try {
    const { data } = await fn()
    return (data ?? []) as T[]
  } catch {
    return []
  }
}

function toDateStr(d: string | Date | null | undefined): string | null {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    requireDevOnly()
  } catch {
    return NextResponse.json({ error: 'Search User is only available in development' }, { status: 403 })
  }

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const db = adminSupabase
  if (!db) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  }

  const authUser = (await db.auth.admin.getUserById(userId)).data?.user ?? null
  const profileRes = await db.from('user_profiles').select('*').eq('id', userId).maybeSingle()
  const profile = profileRes.data

  const [
    morningTasks,
    morningDecisions,
    eveningReviews,
    personalPrompts,
    emergencies,
    insightFeedback,
    feedback,
    taskPostponements,
    userPatterns,
    weeklyInsightsRaw,
    insightHistoryRaw,
  ] = await Promise.all([
    safeQuery(() => (db as any).from('morning_tasks').select('*').eq('user_id', userId).order('plan_date', { ascending: false })),
    safeQuery(() => (db as any).from('morning_decisions').select('*').eq('user_id', userId).order('plan_date', { ascending: false })),
    safeQuery(() => (db as any).from('evening_reviews').select('*').eq('user_id', userId).order('review_date', { ascending: false })),
    safeQuery(() => (db as any).from('personal_prompts').select('*').eq('user_id', userId).order('generated_at', { ascending: false })),
    safeQuery(() => (db as any).from('emergencies').select('*').eq('user_id', userId).order('fire_date', { ascending: false })),
    safeQuery(() => (db as any).from('insight_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
    safeQuery(() => (db as any).from('feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
    safeQuery(() => (db as any).from('task_postponements').select('*').eq('user_id', userId).order('moved_at', { ascending: false })),
    safeQuery(() => (db as any).from('user_patterns').select('*').eq('user_id', userId).order('detected_at', { ascending: false })),
    safeQuery(() => (db as any).from('weekly_insights').select('*').eq('user_id', userId).order('week_start', { ascending: false })),
    safeQuery(() => (db as any).from('insight_history').select('*').eq('user_id', userId).order('period_start', { ascending: false })),
  ])

  // Build days: Record<date, DayEntry>
  const days: Record<string, {
    date: string
    morningInsight?: Record<string, unknown>
    morningTasks?: Record<string, unknown>[]
    morningDecision?: Record<string, unknown>
    postMorningInsight?: Record<string, unknown>
    emergencies?: Record<string, unknown>[]
    emergencyInsights?: Record<string, unknown>[]
    eveningReview?: Record<string, unknown>
    eveningInsight?: Record<string, unknown>
    feedback?: Record<string, unknown>[]
  }> = {}

  const ensureDay = (dateStr: string) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return null
    if (!days[dateStr]) days[dateStr] = { date: dateStr }
    return days[dateStr]
  }

  // 1. Morning insight (personal_prompts type='morning')
  for (const p of personalPrompts as { prompt_date?: string; prompt_type?: string }[]) {
    if (p.prompt_type !== 'morning') continue
    const d = toDateStr(p.prompt_date)
    if (!d) continue
    const day = ensureDay(d)
    if (day) day.morningInsight = p as Record<string, unknown>
  }

  // 2. Morning tasks + decision
  for (const t of morningTasks as { plan_date?: string }[]) {
    const d = toDateStr(t.plan_date)
    if (!d) continue
    const day = ensureDay(d)
    if (day) {
      if (!day.morningTasks) day.morningTasks = []
      day.morningTasks.push(t as Record<string, unknown>)
    }
  }
  for (const [, day] of Object.entries(days)) {
    if (day.morningTasks) {
      day.morningTasks.sort((a, b) => ((a.task_order as number) ?? 0) - ((b.task_order as number) ?? 0))
    }
  }
  for (const d of morningDecisions as { plan_date?: string }[]) {
    const dateStr = toDateStr(d.plan_date)
    if (!dateStr) continue
    const day = ensureDay(dateStr)
    if (day) day.morningDecision = d as Record<string, unknown>
  }

  // 3. Post-morning insight
  for (const p of personalPrompts as { prompt_date?: string; prompt_type?: string }[]) {
    if (p.prompt_type !== 'post_morning') continue
    const d = toDateStr(p.prompt_date)
    if (!d) continue
    const day = ensureDay(d)
    if (day) day.postMorningInsight = p as Record<string, unknown>
  }

  // 4. Emergencies (by fire_date)
  const emergenciesByDate = new Map<string, Record<string, unknown>[]>()
  for (const e of emergencies as { fire_date?: string }[]) {
    const d = toDateStr(e.fire_date)
    if (!d) continue
    if (!emergenciesByDate.has(d)) emergenciesByDate.set(d, [])
    emergenciesByDate.get(d)!.push(e as Record<string, unknown>)
  }
  for (const [dateStr, arr] of emergenciesByDate) {
    const day = ensureDay(dateStr)
    if (day) day.emergencies = arr
  }

  // 5. Emergency insights (personal_prompts type='emergency', link via emergency_id -> emergencies.fire_date)
  const emergenciesById = new Map((emergencies as { id?: string; fire_date?: string }[]).map((e) => [e.id, e]))
  for (const p of personalPrompts as { prompt_type?: string; emergency_id?: string }[]) {
    if (p.prompt_type !== 'emergency' || !p.emergency_id) continue
    const em = emergenciesById.get(p.emergency_id)
    const d = em ? toDateStr(em.fire_date) : null
    if (!d) continue
    const day = ensureDay(d)
    if (day) {
      if (!day.emergencyInsights) day.emergencyInsights = []
      day.emergencyInsights.push(p as Record<string, unknown>)
    }
  }

  // 6. Evening review
  for (const r of eveningReviews as { review_date?: string }[]) {
    const d = toDateStr(r.review_date)
    if (!d) continue
    const day = ensureDay(d)
    if (day) day.eveningReview = r as Record<string, unknown>
  }

  // 7. Evening insight
  for (const p of personalPrompts as { prompt_date?: string; prompt_type?: string }[]) {
    if (p.prompt_type !== 'post_evening') continue
    const d = toDateStr(p.prompt_date)
    if (!d) continue
    const day = ensureDay(d)
    if (day) day.eveningInsight = p as Record<string, unknown>
  }

  // 8. Feedback (by created_at date)
  const feedbackByDate = new Map<string, Record<string, unknown>[]>()
  for (const f of insightFeedback as { created_at?: string }[]) {
    const d = toDateStr(f.created_at)
    if (!d) continue
    if (!feedbackByDate.has(d)) feedbackByDate.set(d, [])
    feedbackByDate.get(d)!.push(f as Record<string, unknown>)
  }
  for (const [dateStr, arr] of feedbackByDate) {
    const day = ensureDay(dateStr)
    if (day) day.feedback = arr
  }

  // Sort days by date descending (most recent first)
  const sortedDayEntries = Object.entries(days).sort((a, b) => b[0].localeCompare(a[0]))
  const daysOrdered = Object.fromEntries(sortedDayEntries)

  // Weekly insights
  const weeklyInsights = (weeklyInsightsRaw as { week_start?: string; week_end?: string; insight_text?: string; unseen_wins_pattern?: string }[]).map((w) => ({
    week_start: w.week_start,
    week_end: w.week_end,
    insight_text: w.insight_text,
    unseen_wins_pattern: w.unseen_wins_pattern,
    ...w,
  }))

  // Monthly / quarterly from insight_history
  const monthlyInsights = (insightHistoryRaw as { insight_type?: string; period_start?: string; period_end?: string; insight_text?: string }[]).filter(
    (h) => h.insight_type === 'monthly'
  )
  const quarterlyInsights = (insightHistoryRaw as { insight_type?: string; period_start?: string; period_end?: string; insight_text?: string }[]).filter(
    (h) => h.insight_type === 'quarterly'
  )

  // Patterns
  const postponementByActionPlan: Record<string, number> = {}
  let needleMoverPostponed = 0
  const descCounts = new Map<string, number>()
  for (const p of taskPostponements as { action_plan?: string; is_needle_mover?: boolean; task_description?: string }[]) {
    const ap = p.action_plan ?? 'unknown'
    postponementByActionPlan[ap] = (postponementByActionPlan[ap] ?? 0) + 1
    if (p.is_needle_mover) needleMoverPostponed++
    const desc = (p.task_description ?? '').trim()
    if (desc) descCounts.set(desc, (descCounts.get(desc) ?? 0) + 1)
  }
  const totalPostponed = taskPostponements.length
  const needleMoverPostponeRate = totalPostponed > 0 ? Math.round((needleMoverPostponed / totalPostponed) * 100) : 0
  const mostPostponed = Array.from(descCounts.entries()).sort((a, b) => b[1] - a[1])[0]
  const commonFeedbackThemes = (insightFeedback as { feedback?: string; feedback_text?: string }[])
    .filter((f) => f.feedback === 'not-helpful' && f.feedback_text?.trim())
    .map((f) => (f.feedback_text ?? '').trim().slice(0, 80))
  const themeCounts = new Map<string, number>()
  for (const t of commonFeedbackThemes) {
    themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1)
  }
  const commonFeedbackThemesTop = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text]) => text)

  const patterns = {
    postponementStats: {
      total: totalPostponed,
      byActionPlan: postponementByActionPlan,
    },
    mostPostponedTask: mostPostponed ? { description: mostPostponed[0], count: mostPostponed[1] } : undefined,
    needleMoverPostponeRate,
    commonFeedbackThemes: commonFeedbackThemesTop.length > 0 ? commonFeedbackThemesTop : undefined,
  }

  return NextResponse.json({
    profile,
    auth: authUser
      ? {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
        }
      : null,
    days: daysOrdered,
    weeklyInsights,
    monthlyInsights,
    quarterlyInsights,
    patterns,
    userPatterns,
    insightFeedback,
    feedback,
    // Raw data for debugging (Raw Data tab)
    _raw: {
      morningTasks,
      morningDecisions,
      eveningReviews,
      personalPrompts,
      emergencies,
      insightFeedback,
      feedback,
      taskPostponements,
    },
  })
}
