import type { SupabaseClient } from '@supabase/supabase-js'
import { ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import type { ArchetypeUnlockChecklist } from '@/lib/types/founder-dna'

function countKeywordHits(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  let hits = 0
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const matches = lower.match(re)
    hits += matches?.length ?? 0
  }
  return hits
}

export async function loadArchetypeUnlockChecklist(
  db: SupabaseClient,
  userId: string,
  profileData: { founder_personality?: string | null },
  daysActive: number
): Promise<ArchetypeUnlockChecklist> {
  const [strategicCountRes, tacticalCountRes, tasksRes, reviewsRes] = await Promise.all([
    db
      .from('morning_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('decision_type', 'strategic'),
    db
      .from('morning_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('decision_type', 'tactical'),
    (async () => {
      const sincePlans = new Date(Date.now() - 90 * 86400000)
      const sincePlanStr = sincePlans.toISOString().slice(0, 10)
      return db
        .from('morning_tasks')
        .select('plan_date, action_plan, description, created_at, completed')
        .eq('user_id', userId)
        .gte('plan_date', sincePlanStr)
        .eq('completed', true)
    })(),
    (async () => {
      const sinceReviews = new Date(Date.now() - 30 * 86400000)
      return db
        .from('evening_reviews')
        .select('wins, lessons')
        .eq('user_id', userId)
        .gte('created_at', sinceReviews.toISOString())
    })(),
  ])

  const strategicCount = strategicCountRes.count ?? 0
  const tacticalCount = tacticalCountRes.count ?? 0
  const totalDecisions = strategicCount + tacticalCount

  const actionPlanCounts: Record<string, number> = {}
  for (const t of tasksRes.data ?? []) {
    const plan = (t as { action_plan?: string | null })?.action_plan
    if (typeof plan !== 'string' || !plan) continue
    actionPlanCounts[plan] = (actionPlanCounts[plan] ?? 0) + 1
  }
  const totalCompletedTasks = (tasksRes.data ?? []).length
  const topPlan = Object.entries(actionPlanCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const winsLessonsText = (reviewsRes.data ?? [])
    .map((r: { wins?: unknown; lessons?: unknown }) => `${r?.wins ?? ''} ${r?.lessons ?? ''}`)
    .join('\n')
  const reviewsCount = reviewsRes.data?.length ?? 0

  const combinedText = `${winsLessonsText ?? ''} ${profileData.founder_personality ?? ''}`.trim()
  const keywordHitsTotal =
    countKeywordHits(combinedText, [
      'vision',
      'future',
      'big',
      'picture',
      'purpose',
      'dream',
      'build',
      'create',
      'iterate',
      'improve',
      'prototype',
      'craft',
      'done',
      'execute',
      'quick',
      'fast',
      'action',
      'momentum',
      'ship',
      'plan',
      'optimize',
      'strategy',
      'system',
      'framework',
      'model',
      'measure',
      'leverage',
    ]) ?? 0

  return {
    unlock: {
      daysActive,
      targetDays: ARCHETYPE_PREVIEW_MIN_DAYS,
      daysRemaining: Math.max(0, ARCHETYPE_PREVIEW_MIN_DAYS - daysActive),
    },
    decisionsSignal: {
      total: totalDecisions,
      strategic: strategicCount,
      tactical: tacticalCount,
      ready: totalDecisions >= 3,
    },
    taskPlansSignal: {
      totalCompletedTasks,
      topPlan,
      ready: totalCompletedTasks >= 3,
    },
    eveningPatternsSignal: {
      reviewsCount,
      keywordHitsTotal,
      ready: reviewsCount >= 2 && keywordHitsTotal >= 2,
    },
    founderPersonalitySignal: {
      provided: !!profileData.founder_personality,
      ready: !!profileData.founder_personality,
    },
  }
}
