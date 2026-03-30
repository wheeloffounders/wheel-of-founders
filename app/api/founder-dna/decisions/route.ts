import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { DECISION_STYLE_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'
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
import type { MorningDecisionBreakdownRow, UserProfileAccessRow } from '@/types/supabase'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type DecisionBreakdownPoint = {
  week_start?: string
  month?: string
  strategic: number
  tactical: number
  total: number
}

type DecisionStyleSnapshot = {
  strategic: number
  tactical: number
  total: number
  insight: string
  example?: {
    decision: string
    type: 'strategic' | 'tactical'
    date: string
    context?: string
  }
  breakdown: {
    weekly: DecisionBreakdownPoint[]
    monthly: DecisionBreakdownPoint[]
  }
}

function isCompleteDecisionSnapshot(s: unknown): s is DecisionStyleSnapshot {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return (
    typeof o.strategic === 'number' &&
    typeof o.tactical === 'number' &&
    typeof o.total === 'number' &&
    typeof o.insight === 'string' &&
    o.breakdown !== null &&
    typeof o.breakdown === 'object'
  )
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('unlocked_features, created_at, last_refreshed, timezone')
      .eq('id', userId)
      .maybeSingle()

    if (profileRes.error) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileRow = profileRes.data as UserProfileAccessRow | null
    const userTimeZone = getUserTimezoneFromProfile(profileRow)
    const daysWithEntries = await getDaysWithEntries(userId, db)

    const unlockedFeatures = Array.isArray(profileRow?.unlocked_features)
      ? (profileRow.unlocked_features as { name?: string }[])
      : []
    const hasFeature = unlockedFeatures.some((f) => f?.name === 'decision_style')

    if (!hasFeature && daysWithEntries < DECISION_STYLE_MIN_DAYS) {
      return NextResponse.json({ error: 'Feature locked' }, { status: 403 })
    }

    const now = new Date()
    const lr = profileRow?.last_refreshed
    const { at: lastStyleAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.decisionStyle)
    const { refresh: shouldRefreshScheduled, reason: refreshReason } = shouldRefreshFounderFeature({
      now,
      lastAt: lastStyleAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })
    const forceRegenerate = process.env.DECISION_STYLE_FORCE_REGENERATE === '1'
    const shouldRefreshStyle = forceRegenerate || shouldRefreshScheduled

    logFounderFeatureRefreshCheck({
      featureName: 'DecisionStyle',
      lastAt: lastStyleAt,
      userTimeZone,
      now,
      targetWeekday: PATTERNS_REFRESH_UTCDAY,
      shouldRefresh: shouldRefreshStyle,
      refreshReason,
      forceRegenerate,
    })

    if (!shouldRefreshScheduled && !forceRegenerate && isCompleteDecisionSnapshot(snapshot)) {
      const meta = buildRefreshResponseMeta({
        didRefresh: false,
        previousLastAt: lastStyleAt,
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

    const since = new Date(Date.now() - 180 * 86400000)

    const [strategicCountRes, tacticalCountRes, breakdownRes, recentDecisionsRes] = await Promise.all([
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
      db
        .from('morning_decisions')
        .select('decision_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true }),
      db
        .from('morning_decisions')
        .select('decision, decision_type, plan_date, why_this_decision, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(80),
    ])

    const strategic = strategicCountRes.count ?? 0
    const tactical = tacticalCountRes.count ?? 0
    const total = strategic + tactical

    if (breakdownRes.error) throw breakdownRes.error
    if (recentDecisionsRes.error) throw recentDecisionsRes.error

    const safeRows = (breakdownRes.data ?? []) as MorningDecisionBreakdownRow[]

    let insight = 'Keep logging decisions to sharpen your pattern.'
    if (total >= 1) {
      const strategicPct = strategic / total
      if (strategicPct >= 0.6) insight = 'You lean strategic in your decisions.'
      else if (strategicPct <= 0.4) insight = 'You lean tactical in your decisions.'
      else insight = 'Your decisions are balanced between strategy and tactics.'
    }

    const pad2 = (n: number) => String(n).padStart(2, '0')
    const formatISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

    const startOfISOWeek = (d: Date) => {
      // Monday = 1 ... Sunday = 7
      const copy = new Date(d)
      const day = copy.getDay() || 7
      const diff = 1 - day
      copy.setDate(copy.getDate() + diff)
      copy.setHours(0, 0, 0, 0)
      return copy
    }

    const startOfMonth = (d: Date) => {
      const copy = new Date(d)
      copy.setDate(1)
      copy.setHours(0, 0, 0, 0)
      return copy
    }

    const weeklyMap = new Map<string, DecisionBreakdownPoint>()
    const monthlyMap = new Map<string, DecisionBreakdownPoint>()

    for (const r of safeRows) {
      const createdAt = r.created_at ? new Date(r.created_at) : null
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue

      const weekStart = startOfISOWeek(createdAt)
      const weekKey = formatISODate(weekStart)
      const monthStart = startOfMonth(createdAt)
      const monthKey = `${monthStart.getFullYear()}-${pad2(monthStart.getMonth() + 1)}`

      const weekPoint = weeklyMap.get(weekKey) ?? { strategic: 0, tactical: 0, total: 0, week_start: weekKey }
      const monthPoint = monthlyMap.get(monthKey) ?? { strategic: 0, tactical: 0, total: 0, month: monthKey }

      if (r.decision_type === 'strategic') weekPoint.strategic += 1
      if (r.decision_type === 'tactical') weekPoint.tactical += 1
      weekPoint.total = weekPoint.strategic + weekPoint.tactical

      if (r.decision_type === 'strategic') monthPoint.strategic += 1
      if (r.decision_type === 'tactical') monthPoint.tactical += 1
      monthPoint.total = monthPoint.strategic + monthPoint.tactical

      weeklyMap.set(weekKey, weekPoint)
      monthlyMap.set(monthKey, monthPoint)
    }

    const weekly = Array.from(weeklyMap.values()).sort((a, b) => {
      const ka = a.week_start ? new Date(a.week_start + 'T00:00:00Z').getTime() : 0
      const kb = b.week_start ? new Date(b.week_start + 'T00:00:00Z').getTime() : 0
      return ka - kb
    })

    const monthly = Array.from(monthlyMap.values()).sort((a, b) => {
      const ka = a.month ? new Date(a.month + '-01T00:00:00Z').getTime() : 0
      const kb = b.month ? new Date(b.month + '-01T00:00:00Z').getTime() : 0
      return ka - kb
    })

    const recentRows = (recentDecisionsRes.data ?? []) as Array<{
      decision?: string | null
      decision_type?: string | null
      plan_date?: string | null
      why_this_decision?: string | null
      created_at?: string | null
    }>

    const formatDecisionDate = (planDate: string | null | undefined, createdAt: string | null | undefined) => {
      if (planDate && /^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
        const d = new Date(`${planDate}T12:00:00Z`)
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        }
      }
      if (createdAt) {
        const d = new Date(createdAt)
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        }
      }
      return ''
    }

    let example:
      | {
          decision: string
          type: 'strategic' | 'tactical'
          date: string
          context?: string
        }
      | undefined

    if (recentRows.length > 0 && total >= 1) {
      const strategicPct = strategic / total
      const dominant: 'strategic' | 'tactical' | 'balanced' =
        strategicPct > 0.6 ? 'strategic' : strategicPct < 0.4 ? 'tactical' : 'balanced'

      const pickBalancedInteresting = () => {
        let best = recentRows[0]!
        let bestScore = 0
        for (const r of recentRows) {
          const dec = String(r.decision ?? '').trim()
          const why = String(r.why_this_decision ?? '').trim()
          const score = dec.length + why.length * 1.2
          if (score > bestScore) {
            bestScore = score
            best = r
          }
        }
        return best
      }

      const pickDominant = (t: 'strategic' | 'tactical') =>
        recentRows.find((r) => r.decision_type === t) ?? recentRows[0]

      const row = dominant === 'balanced' ? pickBalancedInteresting() : pickDominant(dominant)

      const dec = String(row?.decision ?? '').trim()
      const why = String(row?.why_this_decision ?? '').trim()
      const dt = row?.decision_type === 'tactical' ? 'tactical' : 'strategic'

      if (dec && row) {
        const dateStr = formatDecisionDate(row.plan_date, row.created_at ?? null)
        let context: string | undefined
        if (why.length > 0) {
          const snippet = why.length > 120 ? `${why.slice(0, 117)}...` : why
          context = `You noted: ${snippet}`
        } else if (dec.length > 0) {
          const snippet = dec.length > 90 ? `${dec.slice(0, 87)}...` : dec
          context = `You chose to prioritize: ${snippet}`
        }
        example = {
          decision: dec.length > 200 ? `${dec.slice(0, 197)}...` : dec,
          type: dt,
          date: dateStr,
          context,
        }
      }
    }

    const body: DecisionStyleSnapshot = {
      strategic,
      tactical,
      total,
      insight,
      example,
      breakdown: {
        weekly,
        monthly,
      },
    }

    let didRefreshStyle = false
    if (shouldRefreshScheduled || forceRegenerate) {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.decisionStyle, body)
      didRefreshStyle = true
    } else if (lastStyleAt) {
      await mergeFeatureSnapshotPreserveAt(
        db,
        userId,
        LAST_REFRESH_KEYS.decisionStyle,
        body,
        lastStyleAt.toISOString()
      )
    } else {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.decisionStyle, body)
      didRefreshStyle = true
    }

    const meta = buildRefreshResponseMeta({
      didRefresh: didRefreshStyle,
      previousLastAt: lastStyleAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      now,
      userTimeZone,
    })

    return NextResponse.json({
      ...body,
      nextUpdate: meta.nextUpdate,
      fromCache: meta.fromCache,
    })
  } catch (err) {
    console.error('[founder-dna/decisions] error', err)
    return NextResponse.json({ error: 'Failed to load decision style' }, { status: 500 })
  }
}

