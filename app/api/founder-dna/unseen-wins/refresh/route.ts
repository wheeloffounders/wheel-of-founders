import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateUnseenWinsPatternForUser } from '@/lib/patterns/generate-unseen-wins-pattern'
import { SCHEDULE_UNSEEN_WINS_DAY } from '@/lib/founder-dna/unlock-schedule-config'
import {
  getLastCompletedIsoWeekRangeYmdInTimeZone,
  getUserTimezoneFromProfile,
} from '@/lib/timezone'
import {
  LAST_REFRESH_KEYS,
  MIN_DAYS_BETWEEN_FEATURE_REFRESH,
  RHYTHM_REFRESH_UTCDAY,
  buildRefreshResponseMeta,
  logFounderFeatureRefreshCheck,
  parseRefreshEntry,
  shouldRefreshFounderFeature,
  writeFeatureRefresh,
} from '@/lib/founder-dna/update-schedule'
import type { UserProfileAccessRow } from '@/types/supabase'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST: Unseen Wins pattern — respects Tuesday (user TZ) + 7d; first generation after unlock always runs.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    if (daysWithEntries < SCHEDULE_UNSEEN_WINS_DAY) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            daysActive: daysWithEntries,
            target: SCHEDULE_UNSEEN_WINS_DAY,
            remaining: Math.max(0, SCHEDULE_UNSEEN_WINS_DAY - daysWithEntries),
          },
        },
        { status: 403 },
      )
    }

    const now = new Date()
    const lr = profileRow?.last_refreshed
    const { at: lastAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.unseenWins)
    const forceRegenerate = process.env.UNSEEN_WINS_FORCE_REGENERATE === '1'
    const { refresh: shouldRunAiScheduled, reason: refreshReason } = shouldRefreshFounderFeature({
      now,
      lastAt,
      targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })
    const shouldRunAi = forceRegenerate || shouldRunAiScheduled

    logFounderFeatureRefreshCheck({
      featureName: 'UnseenWins',
      lastAt,
      userTimeZone,
      now,
      targetWeekday: RHYTHM_REFRESH_UTCDAY,
      shouldRefresh: shouldRunAi,
      refreshReason,
      forceRegenerate,
    })

    const { weekStart, weekEnd } = getLastCompletedIsoWeekRangeYmdInTimeZone(now, userTimeZone)
    const snap = snapshot as { pattern?: string; weekStart?: string; weekEnd?: string } | undefined
    const snapPattern = typeof snap?.pattern === 'string' ? snap.pattern : null

    async function loadLatestWeeklyPattern(): Promise<string | null> {
      const { data: row } = await db
        .from('weekly_insights')
        .select('unseen_wins_pattern, week_start')
        .eq('user_id', userId)
        .not('unseen_wins_pattern', 'is', null)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      const r = row as { unseen_wins_pattern?: string | null } | null
      return typeof r?.unseen_wins_pattern === 'string' ? r.unseen_wins_pattern : null
    }

    if (!shouldRunAi) {
      const pattern = snapPattern ?? (await loadLatestWeeklyPattern())
      if (!pattern) {
        // No cache and nothing in DB — allow one generation
        const fresh = await generateUnseenWinsPatternForUser(userId)
        const { data: existingRow } = await db
          .from('weekly_insights')
          .select('insight_text')
          .eq('user_id', userId)
          .eq('week_start', weekStart)
          .maybeSingle()
        const existing = existingRow as { insight_text?: string | null } | null
        await (db.from('weekly_insights') as any).upsert(
          {
            user_id: userId,
            week_start: weekStart,
            week_end: weekEnd,
            unseen_wins_pattern: fresh,
            insight_text: existing?.insight_text ?? null,
            generated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,week_start' },
        )
        await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.unseenWins, {
          pattern: fresh,
          weekStart,
          weekEnd,
        })
        const meta = buildRefreshResponseMeta({
          didRefresh: true,
          previousLastAt: lastAt,
          targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
          minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
          now,
          userTimeZone,
        })
        return NextResponse.json({
          pattern: fresh,
          weekStart,
          weekEnd,
          nextUpdate: meta.nextUpdate,
          fromCache: meta.fromCache,
        })
      }

      const meta = buildRefreshResponseMeta({
        didRefresh: false,
        previousLastAt: lastAt,
        targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
        minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
        now,
        userTimeZone,
      })
      return NextResponse.json({
        pattern,
        weekStart: snap?.weekStart ?? weekStart,
        weekEnd: snap?.weekEnd ?? weekEnd,
        nextUpdate: meta.nextUpdate,
        fromCache: meta.fromCache,
      })
    }

    const pattern = await generateUnseenWinsPatternForUser(userId)

    const { data: existingRow } = await db
      .from('weekly_insights')
      .select('insight_text')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle()

    const existing = existingRow as { insight_text?: string | null } | null

    await (db.from('weekly_insights') as any).upsert(
      {
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        unseen_wins_pattern: pattern,
        insight_text: existing?.insight_text ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' },
    )

    await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.unseenWins, {
      pattern,
      weekStart,
      weekEnd,
    })

    const meta = buildRefreshResponseMeta({
      didRefresh: true,
      previousLastAt: lastAt,
      targetWeekdayUTC: RHYTHM_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      now,
      userTimeZone,
    })

    return NextResponse.json({
      pattern,
      weekStart,
      weekEnd,
      nextUpdate: meta.nextUpdate,
      fromCache: meta.fromCache,
    })
  } catch (err) {
    console.error('[founder-dna/unseen-wins/refresh]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to refresh Unseen Wins' },
      { status: 500 },
    )
  }
}
