import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { parseUnlockedFeatures, type UserProfileAccessRow } from '@/types/supabase'
import { getUserDaysActiveCalendar, getUserTimezoneFromProfile } from '@/lib/timezone'
import { getArchetypeJourneyStatus } from '@/lib/founder-dna/archetype-timing'
import { evaluateBadgeUnlocks } from '@/lib/badges/check-badge-unlocks'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function assertAdmin(req: NextRequest): Promise<string | null> {
  const session = await getServerSessionFromRequest(req)
  if (!session) return null
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin flags are custom profile columns
  const { data } = await (db.from('user_profiles') as any)
    .select('is_admin, admin_role')
    .eq('id', session.user.id)
    .maybeSingle()
  const row = (data as { is_admin?: boolean; admin_role?: string } | null) ?? null
  if (row?.is_admin || row?.admin_role === 'super_admin') return session.user.id
  return null
}

function ymd(input: string | null | undefined): string | null {
  const raw = String(input ?? '')
  if (!raw) return null
  const value = raw.includes('T') ? raw.slice(0, 10) : raw
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

export async function GET(req: NextRequest) {
  try {
    const adminUserId = await assertAdmin(req)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = req.nextUrl.searchParams.get('email')?.trim()
    if (!email) {
      return NextResponse.json({ error: 'email query param is required' }, { status: 400 })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile fields can diverge from generated types
    const { data: userRow } = await (db.from('user_profiles') as any)
      .select('id, email, created_at, timezone, badges, current_streak, profile_completed_at, has_seen_morning_tour, founder_personality, unlocked_features, total_quick_wins, is_admin, admin_role')
      .ilike('email', email)
      .maybeSingle()

    const user = (userRow as (UserProfileAccessRow & {
      id?: string
      email?: string | null
      is_admin?: boolean | null
      admin_role?: string | null
    }) | null) ?? null

    if (!user?.id) {
      return NextResponse.json({ error: 'User not found for email' }, { status: 404 })
    }

    const userId = user.id
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [
      taskCountRes,
      decisionCountRes,
      eveningCountRes,
      morningsRes,
      eveningsRes,
      last7MorningsRes,
      last7EveningsRes,
      unlocksRes,
    ] = await Promise.all([
      db.from('morning_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      db.from('morning_decisions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      db.from('evening_reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      db.from('morning_tasks').select('id, plan_date, created_at').eq('user_id', userId),
      db.from('evening_reviews').select('id, review_date, created_at').eq('user_id', userId),
      db
        .from('morning_tasks')
        .select('id, plan_date, description, completed, task_order, created_at')
        .eq('user_id', userId)
        .gte('plan_date', since7)
        .order('plan_date', { ascending: false })
        .order('task_order', { ascending: true }),
      db
        .from('evening_reviews')
        .select('id, review_date, mood, energy, created_at')
        .eq('user_id', userId)
        .gte('review_date', since7)
        .order('review_date', { ascending: false }),
      db
        .from('user_unlocks')
        .select('id, unlock_type, unlock_name, unlocked_at, created_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false }),
    ])

    const morningRows = (morningsRes.data ?? []) as Array<{ plan_date?: string | null }>
    const eveningRows = (eveningsRes.data ?? []) as Array<{ review_date?: string | null }>

    const morningDates = new Set<string>()
    const eveningDates = new Set<string>()
    for (const row of morningRows) {
      const d = ymd(row.plan_date ?? null)
      if (d) morningDates.add(d)
    }
    for (const row of eveningRows) {
      const d = ymd(row.review_date ?? null)
      if (d) eveningDates.add(d)
    }

    const intersection = [...morningDates].filter((d) => eveningDates.has(d)).sort()
    const union = Array.from(new Set([...morningDates, ...eveningDates])).sort()
    const unionDaysWithEntries = union.length

    const userTimeZone = getUserTimezoneFromProfile(user)
    const daysActiveCalendar = getUserDaysActiveCalendar(user.created_at ?? null, userTimeZone)
    const unlockedFeatures = parseUnlockedFeatures(user.unlocked_features)
    const dryRun = evaluateBadgeUnlocks({
      profile: user,
      counts: {
        totalTasks: taskCountRes.count ?? 0,
        totalDecisions: decisionCountRes.count ?? 0,
        totalEvenings: eveningCountRes.count ?? 0,
        daysActive: daysActiveCalendar,
      },
      unlockedFeatures,
      archetypeStatus: getArchetypeJourneyStatus(unionDaysWithEntries),
    })

    const unlockRows = (unlocksRes.data ?? []) as Array<{
      id: string
      unlock_type?: string | null
      unlock_name?: string | null
      unlocked_at?: string | null
      created_at?: string | null
    }>
    const persistedBadgeNames = new Set(
      unlockRows
        .filter((r) => r.unlock_type === 'badge' && typeof r.unlock_name === 'string' && r.unlock_name.length > 0)
        .map((r) => r.unlock_name as string)
    )
    const dryRunNewBadgeNames = new Set(dryRun.newlyUnlocked.map((b) => b.name))
    const missingPersistedBadges = [...dryRunNewBadgeNames].filter((name) => !persistedBadgeNames.has(name))
    const extraPersistedBadgeRows = unlockRows.filter(
      (r) => r.unlock_type === 'badge' && typeof r.unlock_name === 'string' && !dryRun.badges.some((b) => b.name === r.unlock_name)
    )

    return NextResponse.json({
      adminCheckedByUserId: adminUserId,
      user: {
        id: userId,
        email: user.email ?? null,
      },
      timezone: {
        profileTimeZone: userTimeZone,
        createdAt: user.created_at ?? null,
        daysActiveCalendar,
      },
      daysWithEntries: {
        morningDistinctDates: [...morningDates].sort(),
        eveningDistinctDates: [...eveningDates].sort(),
        intersectionCompleteDays: intersection,
        unionActivityDays: union,
        counts: {
          morningDistinct: morningDates.size,
          eveningDistinct: eveningDates.size,
          intersectionCompleteDays: intersection.length,
          unionActivityDays: union.length,
        },
      },
      rawLast7Days: {
        morningTasks: last7MorningsRes.data ?? [],
        eveningReviews: last7EveningsRes.data ?? [],
      },
      unlocks: {
        rows: unlockRows,
        badgeRows: unlockRows.filter((r) => r.unlock_type === 'badge'),
        featureRows: unlockRows.filter((r) => r.unlock_type === 'feature'),
      },
      dryRunEvaluation: {
        inputs: {
          totalTasks: taskCountRes.count ?? 0,
          totalDecisions: decisionCountRes.count ?? 0,
          totalEvenings: eveningCountRes.count ?? 0,
          daysActiveCalendar,
          daysWithEntriesUnion: unionDaysWithEntries,
          archetypeStatus: getArchetypeJourneyStatus(unionDaysWithEntries),
          currentStreak: user.current_streak ?? 0,
          unlockedFeatureNames: unlockedFeatures.map((f) => f.name).sort(),
        },
        badgesAfterRun: dryRun.badges,
        newlyUnlockedIfRunNow: dryRun.newlyUnlocked,
      },
      mismatch: {
        missingPersistedBadges,
        extraPersistedBadgeRows,
      },
      notes: [
        'Read-only endpoint: no writes performed.',
        'daysWithEntries uses union of distinct morning plan dates and evening review dates.',
      ],
    })
  } catch (err) {
    console.error('[debug/unlock-state] error', err)
    return NextResponse.json({ error: 'Failed to inspect unlock state' }, { status: 500 })
  }
}

