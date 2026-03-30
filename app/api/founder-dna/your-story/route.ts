import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { SCHEDULE_STORY_SO_FAR_DAY } from '@/lib/founder-dna/unlock-schedule-config'
import {
  LAST_REFRESH_KEYS,
  MIN_DAYS_BETWEEN_FEATURE_REFRESH,
  RHYTHM_REFRESH_UTCDAY,
  buildRefreshResponseMeta,
  logFounderFeatureRefreshCheck,
  mergeFeatureSnapshotPreserveAt,
  parseRefreshEntry,
  shouldRefreshFounderFeature,
  writeFeatureRefresh,
} from '@/lib/founder-dna/update-schedule'
import type { YourStorySoFarResponse, YourStoryWin } from '@/lib/types/founder-dna'
import {
  attachInsightsToWins,
  generateMrsDeerWinInsightsBatch,
  loadYourStoryFounderContext,
} from '@/lib/founder-dna/generate-your-story-insights'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Win = YourStoryWin

function isYourStorySnapshot(s: unknown): s is Pick<YourStorySoFarResponse, 'wins' | 'totalCount'> {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return Array.isArray(o.wins) && typeof o.totalCount === 'number'
}

/** Legacy snapshots had no per-win AI insights — regenerate once. */
function snapshotHasMrsDeerInsights(s: unknown): boolean {
  if (!isYourStorySnapshot(s)) return false
  const { wins } = s
  if (wins.length === 0) return true
  return wins.every(
    (w) =>
      w &&
      typeof w === 'object' &&
      typeof (w as YourStoryWin).mrsDeerInsight === 'string' &&
      String((w as YourStoryWin).mrsDeerInsight).trim().length > 0,
  )
}

function parseWinsFromReviews(
  rows: Array<{ wins?: unknown; review_date: string }>
): { allWins: Win[]; total: number } {
  const allWins: Win[] = []
  for (const review of rows) {
    let winsList: string[] = []
    if (review.wins) {
      try {
        winsList =
          typeof review.wins === 'string' && (review.wins.startsWith('[') || review.wins.startsWith('"'))
            ? JSON.parse(review.wins)
            : [review.wins]
      } catch {
        winsList = [String(review.wins)]
      }
    }
    for (const win of winsList) {
      if (win?.trim()) {
        allWins.push({
          text: win.trim(),
          date: review.review_date,
          formattedDate: format(new Date(review.review_date), 'MMM d'),
        })
      }
    }
  }
  return { allWins, total: allWins.length }
}

function pickDisplayedWins(allWins: Win[], seedStr: string, max = 5): Win[] {
  const total = allWins.length
  if (total === 0) return []
  const seed = seedStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const shuffled = [...allWins].sort((a, b) => {
    const aHash = (a.text.length + seed) % total
    const bHash = (b.text.length + seed) % total
    return aHash - bHash
  })
  return shuffled.slice(0, max)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('last_refreshed, created_at, timezone')
      .eq('id', userId)
      .maybeSingle()
    if (profileRes.error) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileRow = profileRes.data as { created_at?: string; timezone?: string | null } | null
    const userTimeZone = getUserTimezoneFromProfile(profileRow)
    const daysWithEntries = await getDaysWithEntries(userId, db)
    if (daysWithEntries < SCHEDULE_STORY_SO_FAR_DAY) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            daysActive: daysWithEntries,
            target: SCHEDULE_STORY_SO_FAR_DAY,
            remaining: Math.max(0, SCHEDULE_STORY_SO_FAR_DAY - daysWithEntries),
          },
        },
        { status: 403 },
      )
    }

    const now = new Date()
    const lr = (profileRes.data as { last_refreshed?: unknown } | null)?.last_refreshed
    const { at: lastStoryAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.yourStory)
    const { refresh: shouldRefreshScheduled, reason: refreshReason } = shouldRefreshFounderFeature({
      now,
      lastAt: lastStoryAt,
      targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })

    /** Dev: set YOUR_STORY_FORCE_REGENERATE=1 in .env.local to bypass snapshot (test mock / AI without waiting for Tuesday). */
    const forceRegenerate = process.env.YOUR_STORY_FORCE_REGENERATE === '1'
    const shouldRefreshStory = forceRegenerate || shouldRefreshScheduled

    logFounderFeatureRefreshCheck({
      featureName: 'YourStory',
      lastAt: lastStoryAt,
      userTimeZone,
      now,
      targetWeekday: RHYTHM_REFRESH_UTCDAY,
      shouldRefresh: shouldRefreshStory,
      refreshReason,
      forceRegenerate,
    })

    const canServeCache =
      !forceRegenerate &&
      !shouldRefreshScheduled &&
      isYourStorySnapshot(snapshot) &&
      snapshotHasMrsDeerInsights(snapshot)

    console.log('[YourStory API] branch:', {
      forceRegenerate,
      shouldRefreshScheduled,
      hasSnapshot: isYourStorySnapshot(snapshot),
      snapshotHasInsights: isYourStorySnapshot(snapshot) ? snapshotHasMrsDeerInsights(snapshot) : false,
      willServeCache: canServeCache,
    })

    if (canServeCache) {
      const meta = buildRefreshResponseMeta({
        didRefresh: false,
        previousLastAt: lastStoryAt,
        targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
        minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
        now,
        userTimeZone,
      })
      console.log('[YourStory API] serving cached snapshot (batch generator not run)')
      return NextResponse.json({
        wins: snapshot.wins,
        totalCount: snapshot.totalCount,
        nextUpdate: meta.nextUpdate,
        fromCache: meta.fromCache,
      })
    }

    const twoWeeksAgo = subDays(new Date(), 14).toISOString().split('T')[0]!

    const { data, error } = await db
      .from('evening_reviews')
      .select('wins, review_date')
      .eq('user_id', userId)
      .not('wins', 'is', null)
      .gte('review_date', twoWeeksAgo)
      .order('review_date', { ascending: false })

    if (error) throw error

    const { allWins, total } = parseWinsFromReviews((data ?? []) as Array<{ wins?: unknown; review_date: string }>)
    const seedStr = now.toISOString().slice(0, 10)
    const picked = pickDisplayedWins(allWins, seedStr, 5)

    console.log('[YourStory API] picked wins for generation:', picked.length, 'of', allWins.length, 'total in window')
    console.log(
      '[YourStory API] picked texts:',
      picked.map((w) => w.text.substring(0, 50) + (w.text.length > 50 ? '…' : '')),
    )

    const founderContext = await loadYourStoryFounderContext(db, userId)
    const insightLines = await generateMrsDeerWinInsightsBatch({ wins: picked, founderContext })

    console.log('[YourStory API] Insights from batch (raw lines count):', insightLines.length)
    console.log('[YourStory API] First insight line:', insightLines[0])

    const wins = attachInsightsToWins(picked, insightLines)

    console.log(
      '[YourStory API] Final wins with insights:',
      wins.map((w) => ({
        text: w.text.substring(0, 50),
        insight: w.mrsDeerInsight?.substring(0, 80),
      })),
    )
    console.log('[YourStory API] Distinct insight prefixes:', [...new Set(wins.map((w) => w.mrsDeerInsight.slice(0, 48)))])

    const payload: Pick<YourStorySoFarResponse, 'wins' | 'totalCount'> = {
      wins,
      totalCount: total,
    }

    let didRefresh = false
    if (shouldRefreshScheduled || forceRegenerate) {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.yourStory, payload)
      didRefresh = true
    } else if (lastStoryAt) {
      await mergeFeatureSnapshotPreserveAt(
        db,
        userId,
        LAST_REFRESH_KEYS.yourStory,
        payload,
        lastStoryAt.toISOString()
      )
    } else {
      await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.yourStory, payload)
      didRefresh = true
    }

    const meta = buildRefreshResponseMeta({
      didRefresh,
      previousLastAt: lastStoryAt,
      targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
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
    console.error('[founder-dna/your-story] error', err)
    return NextResponse.json({ error: 'Failed to load your story' }, { status: 500 })
  }
}
