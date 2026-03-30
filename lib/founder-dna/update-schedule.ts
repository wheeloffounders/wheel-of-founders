/**
 * Enforced refresh windows (user's IANA timezone when set; else UTC), ≥7 days between refreshes:
 * - Rhythm (Tuesday, Sun0=2): e.g. your_story, unseen_wins, celebration_gap
 * - Patterns (Wednesday, Sun0=3): e.g. decision_style, postponement, recurring_question, trends
 * First successful load after unlock always refreshes (no prior `at`).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import {
  addDaysToYmdInTz,
  calendarDaysBetweenInTimeZone,
  formatLongDateInTimeZone,
  getLocalDayOfWeekSun0,
  incrementYmdInTz,
} from '@/lib/timezone'

export const MIN_DAYS_BETWEEN_FEATURE_REFRESH = 7

/** JS getUTCDay(): 0 Sun … 2 Tue … 3 Wed — same in user TZ when `userTimeZone` is passed */
export const RHYTHM_REFRESH_UTCDAY = 2
export const PATTERNS_REFRESH_UTCDAY = 3
/** Same cadence as Your Story So Far / Unseen Wins (Rhythm page, Tuesday). */
export const CELEBRATION_GAP_REFRESH_UTCDAY = RHYTHM_REFRESH_UTCDAY

export const LAST_REFRESH_KEYS = {
  energyMood: 'energy_mood',
  firstGlimpse: 'first_glimpse',
  yourStory: 'your_story',
  unseenWins: 'unseen_wins',
  decisionStyle: 'decision_style',
  celebrationGap: 'celebration_gap',
  postponement: 'postponement',
  recurringQuestion: 'recurring_question',
} as const

export type LastRefreshedMap = Record<string, unknown>

export function normalizeLastRefreshed(raw: unknown): LastRefreshedMap {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as LastRefreshedMap
  return {}
}

/**
 * Read one feature entry: supports legacy plain ISO string or { at, snapshot }.
 */
export function parseRefreshEntry(
  raw: unknown,
  key: string
): { at: Date | null; snapshot: unknown } {
  const map = normalizeLastRefreshed(raw)
  const v = map[key]
  if (v == null) return { at: null, snapshot: undefined }
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? { at: null, snapshot: undefined } : { at: d, snapshot: undefined }
  }
  if (typeof v === 'object' && v !== null && 'at' in v) {
    const atRaw = (v as { at?: unknown }).at
    const snap = (v as { snapshot?: unknown }).snapshot
    if (typeof atRaw === 'string') {
      const d = new Date(atRaw)
      return Number.isNaN(d.getTime()) ? { at: null, snapshot: snap } : { at: d, snapshot: snap }
    }
  }
  return { at: null, snapshot: undefined }
}

export function shouldRefreshFounderFeature(args: {
  now: Date
  lastAt: Date | null
  targetWeekdayUTC: number
  minDaysBetween: number
  /** IANA zone from user_profiles.timezone — weekday checked in this zone; omit/UTC → UTC weekday */
  userTimeZone?: string | null
}): { refresh: boolean; reason: 'first' | 'scheduled' | 'cached' } {
  const { now, lastAt, targetWeekdayUTC, minDaysBetween, userTimeZone } = args
  if (!lastAt) return { refresh: true, reason: 'first' }
  /** Always use IANA zone (including `UTC`). Ms/86400 can be 6 on the next Tuesday after last Tue. */
  const tz = userTimeZone?.trim() || 'UTC'
  const daysSince = calendarDaysBetweenInTimeZone(lastAt, now, tz)
  const dow = getLocalDayOfWeekSun0(now, tz)
  const isTarget = dow === targetWeekdayUTC
  const lastDow = getLocalDayOfWeekSun0(lastAt, tz)
  /** Last refresh landed on a different weekday (e.g. Wed backfill) → next Tue/Wed is only 6 calendar days away but should still run. */
  const offCycleCatchUp =
    lastDow !== targetWeekdayUTC &&
    daysSince >= Math.max(1, minDaysBetween - 1) &&
    daysSince < minDaysBetween
  if (isTarget && (daysSince >= minDaysBetween || offCycleCatchUp)) {
    return { refresh: true, reason: 'scheduled' }
  }
  return { refresh: false, reason: 'cached' }
}

const WEEKDAY_SUN0_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Structured server logs for preview/staging (weekly refresh diagnostics). */
export function logFounderFeatureRefreshCheck(args: {
  featureName: string
  lastAt: Date | null
  userTimeZone: string | undefined | null
  now: Date
  targetWeekday: number
  shouldRefresh: boolean
  refreshReason?: 'first' | 'scheduled' | 'cached'
  forceRegenerate?: boolean
}): void {
  const tz = args.userTimeZone?.trim() || 'UTC'
  const calendarDaysSince = args.lastAt ? calendarDaysBetweenInTimeZone(args.lastAt, args.now, tz) : null
  const dow = getLocalDayOfWeekSun0(args.now, tz)
  console.log(`[${args.featureName}] ===== REFRESH CHECK =====`)
  console.log(`[${args.featureName}] lastRefresh:`, args.lastAt?.toISOString() ?? null)
  console.log(`[${args.featureName}] userTimeZone:`, tz)
  console.log(
    `[${args.featureName}] today local weekday:`,
    `${dow} (${WEEKDAY_SUN0_LABELS[dow] ?? '?'})`
  )
  console.log(
    `[${args.featureName}] target weekday:`,
    args.targetWeekday,
    `(${WEEKDAY_SUN0_LABELS[args.targetWeekday] ?? '?'})`
  )
  console.log(`[${args.featureName}] calendarDaysSince:`, calendarDaysSince)
  console.log(
    `[${args.featureName}] lastLocalWeekday (Sun0):`,
    args.lastAt ? getLocalDayOfWeekSun0(args.lastAt, tz) : null,
  )
  console.log(`[${args.featureName}] shouldRefresh:`, args.shouldRefresh)
  if (args.refreshReason) console.log(`[${args.featureName}] refreshReason:`, args.refreshReason)
  console.log(`[${args.featureName}] forceRegenerate:`, args.forceRegenerate ?? false)
  if (process.env.DEBUG_TIMEZONE === '1' || process.env.NEXT_PUBLIC_DEBUG_TIMEZONE === '1') {
    console.log(`[${args.featureName}] todayYmd in TZ:`, formatInTimeZone(args.now, tz, 'yyyy-MM-dd'))
    console.log(`[${args.featureName}] lastYmd in TZ:`, args.lastAt ? formatInTimeZone(args.lastAt, tz, 'yyyy-MM-dd') : null)
  }
}

function utcNoonForCalendarDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
}

/** Next calendar UTC date (on or after `from`) that is `targetWeekdayUTC`, where day length is honored via lastAt + minDays. */
export function nextEligibleRefreshDateUTC(args: {
  lastAt: Date
  targetWeekdayUTC: number
  minDaysBetween: number
  now: Date
}): Date {
  const { lastAt, targetWeekdayUTC, minDaysBetween, now } = args
  const tz = 'UTC'
  const lastYmd = formatInTimeZone(lastAt, tz, 'yyyy-MM-dd')
  const minEligibleYmd = addDaysToYmdInTz(lastYmd, minDaysBetween, tz)
  const todayYmd = formatInTimeZone(now, tz, 'yyyy-MM-dd')
  let ymd = todayYmd >= minEligibleYmd ? todayYmd : minEligibleYmd
  let guard = 0
  while (guard < 370) {
    const d = new Date(
      Date.UTC(
        parseInt(ymd.slice(0, 4), 10),
        parseInt(ymd.slice(5, 7), 10) - 1,
        parseInt(ymd.slice(8, 10), 10),
        12,
        0,
        0
      )
    )
    if (d.getUTCDay() === targetWeekdayUTC) return d
    ymd = incrementYmdInTz(ymd, tz)
    guard++
  }
  return utcNoonForCalendarDate(now)
}

/** Next calendar date in user TZ (noon local) matching `targetWeekdayUTC` (Sun0), honoring minDays since lastAt. */
export function nextEligibleRefreshDateInTimeZone(args: {
  lastAt: Date
  targetWeekdayUTC: number
  minDaysBetween: number
  now: Date
  timeZone: string
}): Date {
  const { lastAt, targetWeekdayUTC, minDaysBetween, now, timeZone } = args
  const lastYmd = formatInTimeZone(lastAt, timeZone, 'yyyy-MM-dd')
  const minEligibleYmd = addDaysToYmdInTz(lastYmd, minDaysBetween, timeZone)
  const todayYmd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  let ymd = todayYmd >= minEligibleYmd ? todayYmd : minEligibleYmd
  for (let guard = 0; guard < 370; guard++) {
    const noon = fromZonedTime(`${ymd}T12:00:00`, timeZone)
    if (getLocalDayOfWeekSun0(noon, timeZone) === targetWeekdayUTC) return noon
    ymd = incrementYmdInTz(ymd, timeZone)
  }
  return fromZonedTime(`${ymd}T12:00:00`, timeZone)
}

export function formatLongDateUTC(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatNextUpdateLabelUTC(args: {
  lastAt: Date
  targetWeekdayUTC: number
  minDaysBetween: number
  now: Date
}): string {
  return formatLongDateUTC(nextEligibleRefreshDateUTC(args))
}

export function formatNextUpdateLabelInTimeZone(args: {
  lastAt: Date
  targetWeekdayUTC: number
  minDaysBetween: number
  now: Date
  timeZone: string
}): string {
  return formatLongDateInTimeZone(nextEligibleRefreshDateInTimeZone(args), args.timeZone)
}

export function buildRefreshResponseMeta(args: {
  didRefresh: boolean
  previousLastAt: Date | null
  targetWeekdayUTC: number
  minDaysBetween: number
  now: Date
  /** When set, next-update label uses this IANA zone */
  userTimeZone?: string | null
}): { nextUpdate: string; fromCache: boolean } {
  const { didRefresh, previousLastAt, targetWeekdayUTC, minDaysBetween, now, userTimeZone } = args
  const anchor = didRefresh ? now : previousLastAt ?? now
  const tz = userTimeZone?.trim()
  const nextUpdate =
    tz && tz !== 'UTC'
      ? formatNextUpdateLabelInTimeZone({
          lastAt: anchor,
          targetWeekdayUTC,
          minDaysBetween,
          now,
          timeZone: tz,
        })
      : formatNextUpdateLabelUTC({
          lastAt: anchor,
          targetWeekdayUTC,
          minDaysBetween,
          now,
        })
  return { nextUpdate, fromCache: !didRefresh }
}

export async function writeFeatureRefresh(
  db: SupabaseClient,
  userId: string,
  key: string,
  snapshot?: unknown
): Promise<void> {
  const at = new Date().toISOString()
  const { data: row, error } = await db.from('user_profiles').select('last_refreshed').eq('id', userId).maybeSingle()
  if (error) throw error
  const cur = normalizeLastRefreshed((row as { last_refreshed?: unknown } | null)?.last_refreshed)
  const entry: Record<string, unknown> = { at }
  if (snapshot !== undefined) entry.snapshot = snapshot
  const next = { ...cur, [key]: entry }
  const { error: upErr } = await (db.from('user_profiles') as any).update({ last_refreshed: next }).eq('id', userId)
  if (upErr) throw upErr
}

/** Keep existing `at`, only fill/update snapshot (e.g. backfill after schema change). */
export async function mergeFeatureSnapshotPreserveAt(
  db: SupabaseClient,
  userId: string,
  key: string,
  snapshot: unknown,
  existingAtIso: string
): Promise<void> {
  const { data: row, error } = await db.from('user_profiles').select('last_refreshed').eq('id', userId).maybeSingle()
  if (error) throw error
  const cur = normalizeLastRefreshed((row as { last_refreshed?: unknown } | null)?.last_refreshed)
  const entry: Record<string, unknown> = { at: existingAtIso, snapshot }
  const next = { ...cur, [key]: entry }
  const { error: upErr } = await (db.from('user_profiles') as any).update({ last_refreshed: next }).eq('id', userId)
  if (upErr) throw upErr
}

export async function getDaysSinceFirstEntryServer(db: SupabaseClient, userId: string): Promise<number> {
  const { data: evRows } = await db
    .from('evening_reviews')
    .select('review_date')
    .eq('user_id', userId)
    .order('review_date', { ascending: true })
    .limit(1)
  const ev = evRows?.[0] as { review_date?: string } | undefined
  if (ev?.review_date) {
    const first = new Date(ev.review_date)
    return Math.max(0, Math.floor((Date.now() - first.getTime()) / 86_400_000))
  }
  const { data: taskRows } = await db
    .from('morning_tasks')
    .select('plan_date')
    .eq('user_id', userId)
    .order('plan_date', { ascending: true })
    .limit(1)
  const t = taskRows?.[0] as { plan_date?: string } | undefined
  if (t?.plan_date) {
    const first = new Date(t.plan_date)
    return Math.max(0, Math.floor((Date.now() - first.getTime()) / 86_400_000))
  }
  return 0
}
