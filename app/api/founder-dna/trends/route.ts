import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import type { EnergyMoodInsight } from '@/lib/types/founder-dna'
import { SCHEDULE_ENERGY_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'
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
import type { EveningReviewTrendRow, UserProfileAccessRow } from '@/types/supabase'
import { fromZonedTime } from 'date-fns-tz'
import { getLocalDayOfWeekSun0, getUserTimezoneFromProfile } from '@/lib/timezone'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DayPoint = {
  date: string
  mood: number
  energy: number
  weekday: number
}

function parseDay(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`)
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(parseDay(b).getTime() - parseDay(a).getTime())
  return Math.round(ms / 86400000)
}

function addInsightsDedup(
  out: EnergyMoodInsight[],
  insight: EnergyMoodInsight,
  seen: Set<string>,
  max = 6
) {
  const key = `${insight.type}:${insight.description}`
  if (seen.has(key) || out.length >= max) return
  seen.add(key)
  out.push(insight)
}

/**
 * Pattern detection on sorted daily points (one row per calendar day).
 * O(n) over number of days — fine for ~90 points.
 */
export function computeEnergyMoodInsights(points: DayPoint[]): EnergyMoodInsight[] {
  const out: EnergyMoodInsight[] = []
  const seen = new Set<string>()

  if (points.length < 5) return out

  // --- Correlation: mood & energy move same direction when both change (consecutive days)
  let corrSame = 0
  let corrTotal = 0
  for (let i = 1; i < points.length; i++) {
    const dm = points[i]!.mood - points[i - 1]!.mood
    const de = points[i]!.energy - points[i - 1]!.energy
    if (dm === 0 && de === 0) continue
    if (dm !== 0 && de !== 0) {
      corrTotal++
      if (Math.sign(dm) === Math.sign(de)) corrSame++
    }
  }
  if (corrTotal >= 5 && corrSame / corrTotal >= 0.8) {
    addInsightsDedup(
      out,
      {
        type: 'correlation',
        description:
          'Mood and energy tend to move together for you — when one shifts, the other often follows. Mrs. Deer sees that as one integrated signal.',
        pattern: `${Math.round((corrSame / corrTotal) * 100)}% same-direction days`,
      },
      seen
    )
  }

  // --- Weekly rhythm: weekday vs weekend average energy
  const weekdayE: number[] = []
  const weekendE: number[] = []
  for (const p of points) {
    if (p.weekday === 0 || p.weekday === 6) weekendE.push(p.energy)
    else if (p.weekday >= 1 && p.weekday <= 5) weekdayE.push(p.energy)
  }
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const wAvg = avg(weekdayE)
  const weAvg = avg(weekendE)
  if (weekdayE.length >= 5 && weekendE.length >= 2) {
    if (wAvg - weAvg >= 0.5) {
      addInsightsDedup(
        out,
        {
          type: 'weekly_rhythm',
          description:
            "You're a bit more energized on weekdays than on weekends — totally normal if your weeks hold structure and weekends feel open-ended.",
          pattern: 'Weekdays vs weekends',
        },
        seen
      )
    } else if (weAvg - wAvg >= 0.5) {
      addInsightsDedup(
        out,
        {
          type: 'weekly_rhythm',
          description:
            'Your energy often lifts on weekends compared to weekdays — a sign your body may be asking for recovery during the week.',
          pattern: 'Weekends vs weekdays',
        },
        seen
      )
    }
  }

  // --- Energy drop / mood peak by weekday (3+ occurrences, span >= 14 days)
  for (let wd = 0; wd < 7; wd++) {
    const lowE = points.filter((p) => p.weekday === wd && p.energy < 3)
    if (lowE.length >= 3) {
      const sorted = [...lowE].sort((a, b) => a.date.localeCompare(b.date))
      const span = daysBetween(sorted[0]!.date, sorted[sorted.length - 1]!.date)
      if (span >= 14) {
        const name = WEEKDAY_NAMES[wd]!
        addInsightsDedup(
          out,
          {
            type: 'energy_drop',
            description: `Your energy tends to dip on ${name}s — Mrs. Deer has noticed that across several weeks, not just once.`,
            day: name,
            pattern: `Every ${name}`,
          },
          seen
        )
        break
      }
    }
  }

  for (let wd = 0; wd < 7; wd++) {
    const highM = points.filter((p) => p.weekday === wd && p.mood > 4)
    if (highM.length >= 3) {
      const sorted = [...highM].sort((a, b) => a.date.localeCompare(b.date))
      const span = daysBetween(sorted[0]!.date, sorted[sorted.length - 1]!.date)
      if (span >= 14) {
        const name = WEEKDAY_NAMES[wd]!
        addInsightsDedup(
          out,
          {
            type: 'mood_peak',
            description: `Your mood often peaks on ${name}s — you're ending that slice of the week on a brighter note.`,
            day: name,
            pattern: `Every ${name}`,
          },
          seen
        )
        break
      }
    }
  }

  // --- Recovery: low energy day followed by strong next calendar day
  let recoveries = 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    if (a.energy < 3 && b.energy >= 4) {
      const gap = daysBetween(a.date, b.date)
      if (gap === 1) recoveries++
    }
  }
  if (recoveries >= 2) {
    addInsightsDedup(
      out,
      {
        type: 'recovery',
        description:
          'You often bounce back the day after a low-energy evening — that resilience is real; Mrs. Deer sees the pattern in your line.',
        pattern: 'Low energy → stronger next day',
      },
      seen
    )
  }

  return out
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const db = getServerSupabase()

    const [profileRes, unlockRes] = await Promise.all([
      db
        .from('user_profiles')
        .select('unlocked_features, created_at, last_refreshed, timezone')
        .eq('id', userId)
        .maybeSingle(),
      db
        .from('user_unlocks')
        .select('id')
        .eq('user_id', userId)
        .eq('unlock_type', 'feature')
        .eq('unlock_name', 'energy_trends')
        .maybeSingle(),
    ])

    if (profileRes.error && unlockRes.error) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileRow = profileRes.data as UserProfileAccessRow | null
    const userTimeZone = getUserTimezoneFromProfile(profileRow)
    const daysWithEntries = await getDaysWithEntries(userId, db)

    const unlockedFeatures = Array.isArray(profileRow?.unlocked_features)
      ? (profileRow.unlocked_features as { name?: string }[])
      : []
    const hasFeatureFromJson = unlockedFeatures.some((f) => f?.name === 'energy_trends')

    const allowedByEntries = daysWithEntries >= SCHEDULE_ENERGY_MIN_DAYS

    if (!hasFeatureFromJson && !unlockRes.data && !allowedByEntries) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            daysActive: daysWithEntries,
            target: SCHEDULE_ENERGY_MIN_DAYS,
            remaining: Math.max(0, SCHEDULE_ENERGY_MIN_DAYS - daysWithEntries),
          },
        },
        { status: 403 },
      )
    }

    // Longer window for weekday/week-over-week patterns; chart still uses last 30 days.
    const since90 = new Date(Date.now() - 90 * 86400000)
    const since30 = new Date(Date.now() - 30 * 86400000)
    const cutoff30 = since30.toISOString().slice(0, 10)

    const { data: rows, error } = await db
      .from('evening_reviews')
      .select('mood, energy, created_at')
      .eq('user_id', userId)
      .gte('created_at', since90.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    const byDate = new Map<string, { mood: number; energy: number }>()
    const trendRows = (rows ?? []) as EveningReviewTrendRow[]
    for (const r of trendRows) {
      const date = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null
      const mood = typeof r.mood === 'number' ? r.mood : Number(r.mood)
      const energy = typeof r.energy === 'number' ? r.energy : Number(r.energy)
      if (!date) continue
      if (!Number.isFinite(mood) || !Number.isFinite(energy)) continue
      byDate.set(String(date), { mood, energy })
    }

    const allDates = Array.from(byDate.keys()).sort()
    const allPoints: DayPoint[] = allDates.map((d) => {
      const row = byDate.get(d)!
      const noonLocal = fromZonedTime(`${d}T12:00:00`, userTimeZone)
      return {
        date: d,
        mood: row.mood,
        energy: row.energy,
        weekday: getLocalDayOfWeekSun0(noonLocal, userTimeZone),
      }
    })

    const dates30 = allDates.filter((d) => d >= cutoff30)
    const mood = dates30.map((d) => byDate.get(d)!.mood)
    const energy = dates30.map((d) => byDate.get(d)!.energy)

    const now = new Date()
    const lr = profileRow?.last_refreshed
    const { at: lastInsightsAt, snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.energyMood)
    const { refresh: shouldRegenerateInsights } = shouldRefreshFounderFeature({
      now,
      lastAt: lastInsightsAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      userTimeZone,
    })

    const snapInsights = (snapshot as { insights?: EnergyMoodInsight[] } | null)?.insights
    const hasCachedInsights = Array.isArray(snapInsights)

    let insights: EnergyMoodInsight[]
    let didRefreshInsights = false

    if (!shouldRegenerateInsights && hasCachedInsights) {
      insights = snapInsights
    } else {
      insights = computeEnergyMoodInsights(allPoints)
      if (shouldRegenerateInsights) {
        didRefreshInsights = true
        await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.energyMood, { insights })
      } else if (lastInsightsAt) {
        await mergeFeatureSnapshotPreserveAt(
          db,
          userId,
          LAST_REFRESH_KEYS.energyMood,
          { insights },
          lastInsightsAt.toISOString()
        )
      } else {
        didRefreshInsights = true
        await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.energyMood, { insights })
      }
    }

    const meta = buildRefreshResponseMeta({
      didRefresh: didRefreshInsights,
      previousLastAt: lastInsightsAt,
      targetWeekdayUTC: PATTERNS_REFRESH_UTCDAY,
      minDaysBetween: MIN_DAYS_BETWEEN_FEATURE_REFRESH,
      now,
      userTimeZone,
    })

    return NextResponse.json({
      dates: dates30,
      mood,
      energy,
      insights,
      nextUpdate: meta.nextUpdate,
      fromCache: meta.fromCache,
    })
  } catch (err) {
    console.error('[founder-dna/trends] error', err)
    return NextResponse.json({ error: 'Failed to load energy trends' }, { status: 500 })
  }
}
