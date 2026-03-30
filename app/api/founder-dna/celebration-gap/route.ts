import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { findBestLessonForCelebrationGap } from '@/lib/founder-dna/celebration-gap-analysis'
import {
  generateHiddenWinMirrorInsight,
  hiddenWinInsightFallback,
  loadCelebrationGapAiContext,
} from '@/lib/founder-dna/generate-celebration-gap-insights'
import { CELEBRATION_GAP_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'
import {
  CELEBRATION_GAP_REFRESH_UTCDAY,
  LAST_REFRESH_KEYS,
  MIN_DAYS_BETWEEN_FEATURE_REFRESH,
  buildRefreshResponseMeta,
  logFounderFeatureRefreshCheck,
  mergeFeatureSnapshotPreserveAt,
  parseRefreshEntry,
  shouldRefreshFounderFeature,
  writeFeatureRefresh,
} from '@/lib/founder-dna/update-schedule'
import type { CelebrationGapResponse } from '@/lib/types/founder-dna'
import type { UserProfileAccessRow } from '@/types/supabase'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isCelebrationSnapshot(s: unknown): s is CelebrationGapResponse {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return (
    typeof o.lesson === 'string' &&
    typeof o.lessonDate === 'string' &&
    typeof o.insight === 'string' &&
    typeof o.eveningsSampled === 'number'
  )
}

function celebrationGapSnapshotIsCurrent(s: CelebrationGapResponse): boolean {
  return (s.celebrationGapInsightsVersion ?? 0) >= 4
}

function snapshotDebugFields(s: unknown) {
  if (!s || typeof s !== 'object') return { raw: s }
  const o = s as Record<string, unknown>
  return {
    celebrationGapInsightsVersion: o.celebrationGapInsightsVersion,
    hasLesson: typeof o.lesson === 'string' && String(o.lesson).length > 0,
    lessonDate: o.lessonDate,
    insightPreview: typeof o.insight === 'string' ? String(o.insight).slice(0, 100) : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('[CelebrationGap API] === REQUEST START ===')
    console.log('[CelebrationGap API] forceRegenerate env:', process.env.CELEBRATION_GAP_FORCE_REGENERATE)
    console.log('[CelebrationGap API] mockInsights env:', process.env.CELEBRATION_GAP_MOCK_INSIGHTS)

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

    if (daysWithEntries < CELEBRATION_GAP_MIN_DAYS) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            daysActive: daysWithEntries,
            target: CELEBRATION_GAP_MIN_DAYS,
            remaining: Math.max(0, CELEBRATION_GAP_MIN_DAYS - daysWithEntries),
          },
        },
        { status: 403 },
      )
    }

    const now = new Date()
    const lr = profileRow?.last_refreshed
    const { at: lastGapAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.celebrationGap)
    const { refresh: shouldRefreshGap, reason: scheduleReason } = shouldRefreshFounderFeature({
      now,
      lastAt: lastGapAt,
      targetWeekdayUTC: CELEBRATION_GAP_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })

    const forceRegenerate = process.env.CELEBRATION_GAP_FORCE_REGENERATE === '1'

    logFounderFeatureRefreshCheck({
      featureName: 'CelebrationGap',
      lastAt: lastGapAt,
      userTimeZone,
      now,
      targetWeekday: CELEBRATION_GAP_REFRESH_UTCDAY,
      shouldRefresh: forceRegenerate || shouldRefreshGap,
      refreshReason: forceRegenerate ? undefined : scheduleReason,
      forceRegenerate,
    })
    const snap = isCelebrationSnapshot(snapshot) ? snapshot : null
    const snapshotHasAI = snap ? celebrationGapSnapshotIsCurrent(snap) : false

    const willServeCache =
      !forceRegenerate && !shouldRefreshGap && isCelebrationSnapshot(snapshot) && snapshotHasAI

    console.log('[CelebrationGap API] shouldRefreshGap:', shouldRefreshGap)
    console.log('[CelebrationGap API] forceRegenerate flag:', !!forceRegenerate)
    console.log('[CelebrationGap API] willServeCache:', willServeCache)
    console.log('[CelebrationGap API] hasSnapshot:', !!snapshot)
    console.log(
      '[CelebrationGap API] snapshotVersion:',
      isCelebrationSnapshot(snapshot) ? snapshot.celebrationGapInsightsVersion : undefined,
    )
    console.log('[CelebrationGap API] snapshot debug:', snapshotDebugFields(snapshot))

    if (willServeCache && snap) {
      const meta = buildRefreshResponseMeta({
        didRefresh: false,
        previousLastAt: lastGapAt,
        targetWeekdayUTC: CELEBRATION_GAP_REFRESH_UTCDAY,
        minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
        now,
        userTimeZone,
      })
      console.log('[CelebrationGap API] → serving cached snapshot (generator not run)')
      return NextResponse.json({
        ...snap,
        nextUpdate: meta.nextUpdate,
        fromCache: meta.fromCache,
      })
    }

    console.log('[CelebrationGap API] Entering generation path (hidden-win mirror v4)...')

    const cutoff = format(subDays(now, 30), 'yyyy-MM-dd')
    const { data: rows, error } = await db
      .from('evening_reviews')
      .select('lessons, review_date')
      .eq('user_id', userId)
      .gte('review_date', cutoff)
      .order('review_date', { ascending: false })
      .limit(120)

    if (error) throw error

    const rowList = (rows ?? []).map((r: { lessons?: string; review_date?: string }) => ({
      lessons: typeof r.lessons === 'string' ? r.lessons : '',
      review_date: typeof r.review_date === 'string' ? r.review_date : '',
    }))

    const eveningsSampled = rowList.length
    const picked = findBestLessonForCelebrationGap(rowList, now)

    let payload: CelebrationGapResponse

    if (!picked) {
      payload = {
        lesson: '',
        lessonDate: '',
        insight: hiddenWinInsightFallback(''),
        eveningsSampled,
        celebrationGapInsightsVersion: 4,
      }
      console.log('[CelebrationGap API] No scored lesson in window; empty mirror + fallback copy')
    } else {
      console.log('[CelebrationGap API] Picked lesson date:', picked.lessonDate, 'len:', picked.lesson.length)
      const founderContext = await loadCelebrationGapAiContext(db, userId)
      const insight = await generateHiddenWinMirrorInsight({
        lessonText: picked.lesson,
        founderContext,
      })
      payload = {
        lesson: picked.lesson,
        lessonDate: picked.lessonDate,
        insight,
        eveningsSampled,
        celebrationGapInsightsVersion: 4,
      }
      console.log('[CelebrationGap API] Insight preview:', insight.slice(0, 120))
    }

    let didRefresh = false
    if (shouldRefreshGap) {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.celebrationGap, payload)
      didRefresh = true
    } else if (lastGapAt) {
      await mergeFeatureSnapshotPreserveAt(
        db,
        userId,
        LAST_REFRESH_KEYS.celebrationGap,
        payload,
        lastGapAt.toISOString(),
      )
    } else {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.celebrationGap, payload)
      didRefresh = true
    }

    const meta = buildRefreshResponseMeta({
      didRefresh,
      previousLastAt: lastGapAt,
      targetWeekdayUTC: CELEBRATION_GAP_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      now,
      userTimeZone,
    })

    console.log('[CelebrationGap API] Returning fresh payload; version:', payload.celebrationGapInsightsVersion)

    return NextResponse.json({
      ...payload,
      nextUpdate: meta.nextUpdate,
      fromCache: meta.fromCache,
    })
  } catch (err) {
    console.error('[CelebrationGap API] error', err)
    return NextResponse.json({ error: 'Failed to load celebration gap' }, { status: 500 })
  }
}
