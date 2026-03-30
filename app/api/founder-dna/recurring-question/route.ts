import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { computeRecurringQuestions } from '@/lib/founder-dna/recurring-question-analysis'
import { RECURRING_QUESTION_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'
import {
  LAST_REFRESH_KEYS,
  MIN_DAYS_BETWEEN_FEATURE_REFRESH,
  PATTERNS_REFRESH_UTCDAY,
  buildRefreshResponseMeta,
  mergeFeatureSnapshotPreserveAt,
  parseRefreshEntry,
  shouldRefreshFounderFeature,
  writeFeatureRefresh,
} from '@/lib/founder-dna/update-schedule'
import type { RecurringQuestionResponse } from '@/lib/types/founder-dna'
import type { UserProfileAccessRow } from '@/types/supabase'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isRecurringSnapshot(s: unknown): s is RecurringQuestionResponse {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return typeof o.intro === 'string' && Array.isArray(o.questions) && typeof o.eveningsSampled === 'number'
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('created_at, last_refreshed, timezone')
      .eq('id', userId)
      .maybeSingle()
    if (profileRes.error) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }
    const profileRow = profileRes.data as UserProfileAccessRow | null
    const userTimeZone = getUserTimezoneFromProfile(profileRow)
    const daysWithEntries = await getDaysWithEntries(userId, db)

    if (daysWithEntries < RECURRING_QUESTION_MIN_DAYS) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            daysActive: daysWithEntries,
            target: RECURRING_QUESTION_MIN_DAYS,
            remaining: Math.max(0, RECURRING_QUESTION_MIN_DAYS - daysWithEntries),
          },
        },
        { status: 403 }
      )
    }

    const now = new Date()
    const lr = profileRow?.last_refreshed
    const { at: lastRqAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.recurringQuestion)
    const { refresh: shouldRefreshRq } = shouldRefreshFounderFeature({
      now,
      lastAt: lastRqAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })

    if (!shouldRefreshRq && isRecurringSnapshot(snapshot)) {
      const meta = buildRefreshResponseMeta({
        didRefresh: false,
        previousLastAt: lastRqAt,
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

    const [reviewsRes, decisionsRes] = await Promise.all([
      db
        .from('evening_reviews')
        .select('lessons')
        .eq('user_id', userId)
        .order('review_date', { ascending: false })
        .limit(150),
      db
        .from('morning_decisions')
        .select('why_this_decision')
        .eq('user_id', userId)
        .order('plan_date', { ascending: false })
        .limit(200),
    ])

    if (reviewsRes.error) throw reviewsRes.error
    if (decisionsRes.error) throw decisionsRes.error

    const reviewRows = reviewsRes.data ?? []
    const decisionRows = decisionsRes.data ?? []

    const lessonTexts = reviewRows.map((r: { lessons?: string }) =>
      typeof r.lessons === 'string' ? r.lessons : ''
    )

    const whyTexts = decisionRows.map((r: { why_this_decision?: string }) =>
      typeof r.why_this_decision === 'string' ? r.why_this_decision : ''
    )

    const payload = computeRecurringQuestions({
      lessonTexts,
      whyTexts,
      lessonRowCount: reviewRows.length,
      whyRowCount: decisionRows.length,
    }) as RecurringQuestionResponse

    let didRefresh = false
    if (shouldRefreshRq) {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.recurringQuestion, payload)
      didRefresh = true
    } else if (lastRqAt) {
      await mergeFeatureSnapshotPreserveAt(
        db,
        userId,
        LAST_REFRESH_KEYS.recurringQuestion,
        payload,
        lastRqAt.toISOString()
      )
    } else {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.recurringQuestion, payload)
      didRefresh = true
    }

    const meta = buildRefreshResponseMeta({
      didRefresh,
      previousLastAt: lastRqAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      now,
      userTimeZone,
    })

    return NextResponse.json({
      ...payload,
      nextUpdate: meta.nextUpdate,
      fromCache: meta.fromCache,
    })
  } catch (err) {
    console.error('[founder-dna/recurring-question] error', err)
    return NextResponse.json({ error: 'Failed to load recurring questions' }, { status: 500 })
  }
}
