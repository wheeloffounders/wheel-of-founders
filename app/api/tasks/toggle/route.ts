import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { checkAndPersistBadgeUnlocks } from '@/lib/badges/check-badge-unlocks'
import { getArchetypeJourneyStatus } from '@/lib/founder-dna/archetype-timing'
import { getUserDaysActiveCalendar, getUserTimezoneFromProfile } from '@/lib/timezone'
import type { UserProfileAccessRow } from '@/types/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isQuickWinPlan(raw: unknown): boolean {
  const p = String(raw ?? '').toLowerCase().trim()
  return p === 'quick_win_founder' || p === 'quick win' || p === 'quick_win'
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { taskId, completed } = body as { taskId?: string; completed?: boolean }

    if (!taskId || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'taskId and completed are required' }, { status: 400 })
    }

    const db = getServerSupabase() as any
    const nowIso = new Date().toISOString()

    const { data: beforeTask, error: beforeErr } = await db
      .from('morning_tasks')
      .select('completed, action_plan')
      .eq('id', taskId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (beforeErr) {
      console.error('[tasks/toggle] before-read DB error', beforeErr)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
    if (!beforeTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      completed,
      updated_at: nowIso,
    }

    const { data, error } = await db
      .from('morning_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', session.user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[tasks/toggle] DB error', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const transitionedToComplete = beforeTask.completed !== true && completed === true
    const wasQuickWin = isQuickWinPlan(beforeTask.action_plan)

    if (transitionedToComplete && wasQuickWin) {
      const { data: profileRow } = await db
        .from('user_profiles')
        .select('total_quick_wins')
        .eq('id', session.user.id)
        .maybeSingle()
      const cur = (profileRow as { total_quick_wins?: number } | null)?.total_quick_wins ?? 0
      const next = cur + 1
      await db.from('user_profiles').update({ total_quick_wins: next }).eq('id', session.user.id)

      if (next >= 50) {
        const [countsRes, profileRes] = await Promise.all([
          Promise.all([
            db.from('morning_tasks').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
            db
              .from('morning_tasks')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', session.user.id)
              .eq('completed', true),
            db.from('morning_decisions').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
            db.from('evening_reviews').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
          ]),
          db
            .from('user_profiles')
            .select('created_at, timezone, badges, current_streak, profile_completed_at, has_seen_morning_tour, founder_personality, unlocked_features, total_quick_wins')
            .eq('id', session.user.id)
            .maybeSingle(),
        ])
        const profile = profileRes.data as UserProfileAccessRow | null
        const userTimeZone = getUserTimezoneFromProfile(profile)
        const daysActive = getUserDaysActiveCalendar(profile?.created_at ?? null, userTimeZone)
        const unlockedFeatures = Array.isArray(profile?.unlocked_features)
          ? (profile?.unlocked_features as Array<{ name?: string }>)
          : []
        await checkAndPersistBadgeUnlocks({
          db,
          userId: session.user.id,
          profile,
          counts: {
            totalTasks: countsRes[0].count ?? 0,
            totalDecisions: countsRes[2].count ?? 0,
            totalEvenings: countsRes[3].count ?? 0,
            daysActive,
            completedTasks: countsRes[1].count ?? 0,
          },
          unlockedFeatures,
          archetypeStatus: getArchetypeJourneyStatus(daysActive),
        })
      }
    }

    return NextResponse.json({ success: true, task: data })
  } catch (err) {
    console.error('[tasks/toggle] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

