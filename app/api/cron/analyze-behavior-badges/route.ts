import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { checkAndPersistBadgeUnlocks } from '@/lib/badges/check-badge-unlocks'
import { getArchetypeJourneyStatus } from '@/lib/founder-dna/archetype-timing'
import { getUserDaysActiveCalendar, getUserTimezoneFromProfile } from '@/lib/timezone'
import type { UserProfileAccessRow } from '@/types/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function toWordsCount(raw: unknown): number {
  if (!raw) return 0
  if (Array.isArray(raw)) return raw.reduce((acc, v) => acc + toWordsCount(v), 0)
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>).reduce<number>(
      (acc, v) => acc + toWordsCount(v),
      0,
    )
  }
  const s = String(raw).trim()
  if (!s) return 0
  try {
    const parsed = JSON.parse(s)
    return toWordsCount(parsed)
  } catch {
    return s.split(/\s+/).filter(Boolean).length
  }
}

function isFocusTimePlan(plan: unknown): boolean {
  const p = String(plan ?? '').toLowerCase().trim()
  return p === 'my_zone' || p === 'focus_time' || p === 'focus time'
}

function parseLastRefreshed(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

function deepGet(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj
  for (const p of path) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/analyze-behavior-badges', request)
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const db = getServerSupabase()
  const start = Date.now()
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const { data: profiles, error } = await db
    .from('user_profiles')
    .select('id, created_at, timezone, badges, current_streak, profile_completed_at, has_seen_morning_tour, founder_personality, unlocked_features, total_quick_wins, last_refreshed')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  type ProfileRow = UserProfileAccessRow & { id: string; last_refreshed?: unknown }
  const users = (profiles ?? []) as ProfileRow[]

  let processed = 0
  let updated = 0
  let failed = 0
  const errors: Array<{ userId: string; error: string }> = []

  for (const p of users) {
    try {
      const userId = p.id
      const [taskRowsRes, decisionRowsRes, eveningRowsRes, tCountRes, tCompletedRes, dCountRes, eCountRes] =
        await Promise.all([
        db
          .from('morning_tasks')
          .select('action_plan')
          .eq('user_id', userId)
          .gte('plan_date', since30),
        db
          .from('morning_decisions')
          .select('decision_type')
          .eq('user_id', userId)
          .gte('plan_date', since30),
        db
          .from('evening_reviews')
          .select('wins, lessons')
          .eq('user_id', userId)
          .gte('review_date', since30),
        db.from('morning_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        db
          .from('morning_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', true),
        db.from('morning_decisions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        db.from('evening_reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ])

      const taskRows = (taskRowsRes.data ?? []) as Array<{ action_plan?: string | null }>
      const decisionRows = (decisionRowsRes.data ?? []) as Array<{ decision_type?: string | null }>
      const eveningRows = (eveningRowsRes.data ?? []) as Array<{ wins?: unknown; lessons?: unknown }>

      const focusCount = taskRows.filter((r) => isFocusTimePlan(r.action_plan)).length
      const deepWorker = taskRows.length >= 30 && focusCount / taskRows.length >= 0.8

      const strategicCount = decisionRows.filter((r) => String(r.decision_type ?? '').toLowerCase() === 'strategic').length
      const tacticalCount = decisionRows.filter((r) => String(r.decision_type ?? '').toLowerCase() === 'tactical').length
      const strategicMind = decisionRows.length >= 10 && strategicCount / decisionRows.length >= 0.8
      const tacticalPro = decisionRows.length >= 10 && tacticalCount / decisionRows.length >= 0.8

      const totalWords = eveningRows.reduce((acc, r) => acc + toWordsCount(r.wins) + toWordsCount(r.lessons), 0)
      const avgWords = eveningRows.length > 0 ? totalWords / eveningRows.length : 0
      const deepReflector = eveningRows.length >= 30 && avgWords > 50

      const lr = parseLastRefreshed(p.last_refreshed)
      const postponementPatterns = deepGet(lr, ['postponement', 'snapshot', 'patterns'])
      const patternSet = new Set<string>()
      if (Array.isArray(postponementPatterns)) {
        for (const row of postponementPatterns) {
          if (typeof row === 'string') patternSet.add(row.toLowerCase().trim())
          else if (row && typeof row === 'object') {
            const plan = String((row as Record<string, unknown>).actionPlan ?? '').toLowerCase().trim()
            if (plan) patternSet.add(plan)
          }
        }
      }
      const patternSeeker = patternSet.size >= 5

      const rqQuestions = deepGet(lr, ['recurring_question', 'snapshot', 'questions'])
      const questionSet = new Set<string>()
      if (Array.isArray(rqQuestions)) {
        for (const q of rqQuestions) {
          if (!q) continue
          if (typeof q === 'string') questionSet.add(q.toLowerCase().trim())
          else if (typeof q === 'object') {
            const s = String((q as Record<string, unknown>).text ?? (q as Record<string, unknown>).question ?? '').toLowerCase().trim()
            if (s) questionSet.add(s)
          }
        }
      }
      const questionAsker = questionSet.size >= 3

      const cgSnap = deepGet(lr, ['celebration_gap', 'snapshot']) as Record<string, unknown> | undefined
      const growthEdge =
        !!cgSnap &&
        Number(cgSnap.celebrationGapInsightsVersion ?? 0) >= 4 &&
        String(cgSnap.lesson ?? '').trim().length > 0 &&
        String(cgSnap.insight ?? '').trim().length > 0

      const userTimeZone = getUserTimezoneFromProfile(p)
      const daysActive = getUserDaysActiveCalendar(p.created_at ?? null, userTimeZone)
      const unlockedFeatures = Array.isArray(p.unlocked_features)
        ? (p.unlocked_features as Array<{ name?: string }>)
        : []

      const before = Array.isArray(p.badges) ? p.badges.length : 0
      const res = await checkAndPersistBadgeUnlocks({
        db,
        userId,
        profile: p,
        counts: {
          totalTasks: tCountRes.count ?? 0,
          totalDecisions: dCountRes.count ?? 0,
          totalEvenings: eCountRes.count ?? 0,
          daysActive,
          completedTasks: tCompletedRes.count ?? 0,
        },
        unlockedFeatures,
        archetypeStatus: getArchetypeJourneyStatus(daysActive),
        behaviorReflection: {
          deepWorker,
          strategicMind,
          tacticalPro,
          deepReflector,
          patternSeeker,
          questionAsker,
          growthEdge,
        },
      })
      processed++
      if (res.badges.length > before) updated++
    } catch (err) {
      failed++
      errors.push({ userId: p.id, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    updated,
    failed,
    totalUsers: users.length,
    processingTimeMs: Date.now() - start,
    errors: errors.slice(0, 25),
  })
}
