import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { POSTPONEMENT_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'
import {
  LAST_REFRESH_KEYS,
  MIN_DAYS_BETWEEN_FEATURE_REFRESH,
  PATTERNS_REFRESH_UTCDAY,
  buildRefreshResponseMeta,
  logFounderFeatureRefreshCheck,
  mergeFeatureSnapshotPreserveAt,
  parseRefreshEntry,
  shouldRefreshFounderFeature,
  writeFeatureRefresh,
} from '@/lib/founder-dna/update-schedule'
import type { UserProfileAccessRow } from '@/types/supabase'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PostponementPattern = {
  actionPlan: string
  count: number
  percentage: number
  tip: string
}

type PostponementResponse = {
  patterns: PostponementPattern[]
  totalPostponements: number
  mostPostponed: string
  insight: string
}

function isPostponementSnapshot(s: unknown): s is PostponementResponse {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return Array.isArray(o.patterns) && typeof o.totalPostponements === 'number' && typeof o.insight === 'string'
}

function planKeyToLabel(plan: string | null | undefined): string {
  switch (plan) {
    case 'my_zone':
      return 'Milestone'
    case 'systemize':
      return 'Systemize'
    case 'delegate_founder':
      return 'Delegate'
    case 'eliminate_founder':
      return 'Eliminate'
    case 'quick_win_founder':
      return 'Quick Win'
    default:
      return plan ? String(plan) : 'Unknown'
  }
}

function tipForPlan(planLabel: string): string {
  switch (planLabel) {
    case 'Milestone':
    case 'Focus Time':
      return "You postpone deep-focus work. Try scheduling it for your highest-energy hour and start with a 20-minute sprint."
    case 'Systemize':
      return 'You delay building systems. Make it tiny: draft a template outline before you start the full build.'
    case 'Delegate':
      return 'You postpone delegation. Write a crisp handoff note and delegate one micro-task to reduce friction.'
    case 'Eliminate':
      return 'You delay elimination. Create a quick “cut list” and remove one low-value task today.'
    case 'Quick Win':
      return 'You postpone quick wins. Batch small wins early in the day so momentum compounds.'
    default:
      return 'You tend to postpone this task type. Break it down and schedule a low-effort first step.'
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('created_at, unlocked_features, last_refreshed, timezone')
      .eq('id', userId)
      .maybeSingle()

    if (profileRes.error) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileRow = profileRes.data as UserProfileAccessRow | null
    const target = POSTPONEMENT_MIN_DAYS
    const userTimeZone = getUserTimezoneFromProfile(profileRow)
    const daysWithEntries = await getDaysWithEntries(userId, db)

    if (daysWithEntries < target) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            daysActive: daysWithEntries,
            target,
            remaining: Math.max(0, target - daysWithEntries),
          },
        },
        { status: 403 }
      )
    }

    const now = new Date()
    const lr = profileRow?.last_refreshed
    const { at: lastPostAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.postponement)
    const { refresh: shouldRefreshScheduled, reason: refreshReason } = shouldRefreshFounderFeature({
      now,
      lastAt: lastPostAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })
    const forceRegenerate = process.env.POSTPONEMENT_FORCE_REGENERATE === '1'
    const shouldRefreshPost = forceRegenerate || shouldRefreshScheduled

    logFounderFeatureRefreshCheck({
      featureName: 'PostponementPatterns',
      lastAt: lastPostAt,
      userTimeZone,
      now,
      targetWeekday: PATTERNS_REFRESH_UTCDAY,
      shouldRefresh: shouldRefreshPost,
      refreshReason,
      forceRegenerate,
    })

    if (!shouldRefreshScheduled && !forceRegenerate && isPostponementSnapshot(snapshot)) {
      const meta = buildRefreshResponseMeta({
        didRefresh: false,
        previousLastAt: lastPostAt,
        targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
        minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
        now,
        userTimeZone,
      })
      return NextResponse.json({
        ...snapshot,
        nextUpdate: meta.nextUpdate,
        fromCache: meta.fromCache,
      })
    }

    // Only compute postponement counts after we know the feature is effectively unlocked.
    const totalRes = await db
      .from('task_postponements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const totalPostponements = totalRes.count ?? 0

    const { data: rows, error } = await db
      .from('task_postponements')
      .select('action_plan')
      .eq('user_id', userId)

    if (error) throw error

    const counts = new Map<string, number>()
    for (const r of rows ?? []) {
      const actionPlanKey = (r as any)?.action_plan
      const key = actionPlanKey ? String(actionPlanKey) : 'unknown'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const total = totalPostponements || Array.from(counts.values()).reduce((a, b) => a + b, 0)
    const patterns: PostponementPattern[] = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const actionPlanLabel = planKeyToLabel(key === 'unknown' ? null : key)
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
        return {
          actionPlan: actionPlanLabel,
          count,
          percentage,
          tip: tipForPlan(actionPlanLabel),
        }
      })

    const mostPostponed = patterns[0]?.actionPlan ?? 'Unknown'

    let insight = 'Mrs. Deer noticed something gentle: you tend to delay the tasks that feel hard to start. That is completely human.'
    if (patterns[0]) {
      insight = `Mrs. Deer noticed something gentle:\n\nYou tend to postpone ${patterns[0].actionPlan} when friction hits. Instead of planning another round, write your next smallest step and put a start time on it.`
    }

    const response: PostponementResponse = {
      patterns,
      totalPostponements: totalPostponements,
      mostPostponed,
      insight,
    }

    let didRefresh = false
    if (shouldRefreshPost) {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.postponement, response)
      didRefresh = true
    } else if (lastPostAt) {
      await mergeFeatureSnapshotPreserveAt(
        db,
        userId,
        LAST_REFRESH_KEYS.postponement,
        response,
        lastPostAt.toISOString()
      )
    } else {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.postponement, response)
      didRefresh = true
    }

    const meta = buildRefreshResponseMeta({
      didRefresh,
      previousLastAt: lastPostAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      now,
      userTimeZone,
    })

    return NextResponse.json({
      ...response,
      nextUpdate: meta.nextUpdate,
      fromCache: meta.fromCache,
    })
  } catch (err) {
    console.error('[founder-dna/postponements] error', err)
    return NextResponse.json({ error: 'Failed to load postponement patterns' }, { status: 500 })
  }
}

