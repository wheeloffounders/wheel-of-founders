/**
 * User-local calendar and clock helpers (IANA zones from user_profiles.timezone).
 * Server cron/APIs must not use server-local Date or UTC-only day math for unlocks.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

/** Default when profile has no / invalid timezone */
export const DEFAULT_USER_TIMEZONE = 'UTC'

export function getUserTimezoneFromProfile(
  row: { timezone?: string | null } | null | undefined
): string {
  const raw = row?.timezone?.trim()
  if (!raw) return DEFAULT_USER_TIMEZONE
  try {
    Intl.DateTimeFormat(undefined, { timeZone: raw })
    return raw
  } catch {
    return DEFAULT_USER_TIMEZONE
  }
}

/** IANA zone from the runtime (browser or Node). Null if unavailable. */
export function getBrowserTimeZone(): string | null {
  if (typeof Intl === 'undefined') return null
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone
    return typeof z === 'string' && z.length > 0 ? z : null
  } catch {
    return null
  }
}

/**
 * Prefer `user_profiles.timezone`; if unset/invalid, use `browserFallback` (from the client).
 * Otherwise UTC — avoids “first day” users inheriting the server’s zone.
 */
export function resolveUserTimeZone(
  row: { timezone?: string | null } | null | undefined,
  browserFallback?: string | null
): string {
  const raw = row?.timezone?.trim()
  if (raw) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: raw })
      return raw
    } catch {
      /* fall through */
    }
  }
  const b = typeof browserFallback === 'string' ? browserFallback.trim() : ''
  if (b) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: b })
      return b
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_USER_TIMEZONE
}

/**
 * Calendar days between signup and now in the user's timezone (0 on signup day).
 */
export function getUserDaysActiveCalendar(
  createdAt: string | Date | null | undefined,
  userTimezone: string,
  now: Date = new Date()
): number {
  if (!createdAt) return 0
  const created = typeof createdAt === 'string' ? createdAt : createdAt.toISOString()
  const start = new Date(created)
  if (Number.isNaN(start.getTime())) return 0
  const y0 = formatInTimeZone(start, userTimezone, 'yyyy-MM-dd')
  const y1 = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd')
  return Math.max(0, differenceInCalendarDays(parseISO(y1), parseISO(y0)))
}

/**
 * Same numbering as Date#getUTCDay(): 0 Sun … 6 Sat, in the given IANA zone.
 */
export function getLocalDayOfWeekSun0(date: Date, timeZone: string): number {
  const isoDow = parseInt(formatInTimeZone(date, timeZone, 'i'), 10)
  if (isoDow === 7) return 0
  return isoDow
}

/**
 * Whole calendar days from `a` → `b` in `timeZone` (date-only, ignores clock time).
 * Used for weekly founder-DNA refresh spacing so Tuesday fires even when last `at` was Tue 6pm and now is Tue 9am (ms-diff could be &lt; 7×24h).
 */
export function calendarDaysBetweenInTimeZone(a: Date, b: Date, timeZone: string): number {
  const ymdA = formatInTimeZone(a, timeZone, 'yyyy-MM-dd')
  const ymdB = formatInTimeZone(b, timeZone, 'yyyy-MM-dd')
  return differenceInCalendarDays(parseISO(ymdB), parseISO(ymdA))
}

export function formatLongDateInTimeZone(d: Date, timeZone: string): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  })
}

/** Next calendar date (yyyy-MM-dd) strictly after `ymd` in `timeZone`. */
export function incrementYmdInTz(ymd: string, timeZone: string): string {
  const start = fromZonedTime(`${ymd}T12:00:00`, timeZone)
  let probe = new Date(start.getTime())
  const orig = formatInTimeZone(probe, timeZone, 'yyyy-MM-dd')
  for (let step = 0; step < 48; step++) {
    probe = new Date(probe.getTime() + 3600000)
    const cur = formatInTimeZone(probe, timeZone, 'yyyy-MM-dd')
    if (cur !== orig) return cur
  }
  return formatInTimeZone(new Date(start.getTime() + 48 * 3600000), timeZone, 'yyyy-MM-dd')
}

export function decrementYmdInTz(ymd: string, timeZone: string): string {
  const start = fromZonedTime(`${ymd}T12:00:00`, timeZone)
  let probe = new Date(start.getTime())
  const orig = formatInTimeZone(probe, timeZone, 'yyyy-MM-dd')
  for (let step = 0; step < 48; step++) {
    probe = new Date(probe.getTime() - 3600000)
    const cur = formatInTimeZone(probe, timeZone, 'yyyy-MM-dd')
    if (cur !== orig) return cur
  }
  return formatInTimeZone(new Date(start.getTime() - 48 * 3600000), timeZone, 'yyyy-MM-dd')
}

export function addDaysToYmdInTz(ymd: string, deltaDays: number, timeZone: string): string {
  if (deltaDays === 0) return ymd
  let cur = ymd
  const step = deltaDays > 0 ? 1 : -1
  const n = Math.abs(deltaDays)
  for (let i = 0; i < n; i++) {
    cur = step > 0 ? incrementYmdInTz(cur, timeZone) : decrementYmdInTz(cur, timeZone)
  }
  return cur
}

/** Next occurrence of weekday (0 Sun … 6 Sat), starting from the day after `from` in user TZ. */
export function nextWeekdayInTimeZone(from: Date, weekdaySun0: number, timeZone: string): Date {
  let ymd = formatInTimeZone(from, timeZone, 'yyyy-MM-dd')
  ymd = addDaysToYmdInTz(ymd, 1, timeZone)
  for (let i = 0; i < 14; i++) {
    const noon = fromZonedTime(`${ymd}T12:00:00`, timeZone)
    if (getLocalDayOfWeekSun0(noon, timeZone) === weekdaySun0) return noon
    ymd = addDaysToYmdInTz(ymd, 1, timeZone)
  }
  return fromZonedTime(`${ymd}T12:00:00`, timeZone)
}

/** Next 1st-of-month 00:00 local strictly after `from`. */
export function nextMonthFirstInTimeZone(from: Date, timeZone: string): Date {
  const ymd = formatInTimeZone(from, timeZone, 'yyyy-MM-dd')
  const [y, m] = ymd.split('-').map(Number)
  const firstThis = fromZonedTime(`${y}-${String(m).padStart(2, '0')}-01T00:00:00`, timeZone)
  if (firstThis.getTime() > from.getTime()) return firstThis
  let nm = m + 1
  let ny = y
  if (nm > 12) {
    nm = 1
    ny++
  }
  return fromZonedTime(`${ny}-${String(nm).padStart(2, '0')}-01T00:00:00`, timeZone)
}

/** Next Monday 00:00 local strictly after `from` (weekly insight cron window). */
export function nextMondayMidnightInTimeZone(from: Date, timeZone: string): Date {
  let ymd = formatInTimeZone(from, timeZone, 'yyyy-MM-dd')
  for (let guard = 0; guard < 370; guard++) {
    const midnight = fromZonedTime(`${ymd}T00:00:00`, timeZone)
    if (getLocalDayOfWeekSun0(midnight, timeZone) === 1 && midnight.getTime() > from.getTime()) {
      return midnight
    }
    ymd = incrementYmdInTz(ymd, timeZone)
  }
  return fromZonedTime(`${ymd}T00:00:00`, timeZone)
}

/** Next Jan/Apr/Jul/Oct 1 00:00 local strictly after `from`. */
export function nextQuarterStartInTimeZone(from: Date, timeZone: string): Date {
  const ymd = formatInTimeZone(from, timeZone, 'yyyy-MM-dd')
  const y = parseInt(ymd.slice(0, 4), 10)
  const m = parseInt(ymd.slice(5, 7), 10)
  const starts = [1, 4, 7, 10] as const
  for (const sm of starts) {
    const d = fromZonedTime(`${y}-${String(sm).padStart(2, '0')}-01T00:00:00`, timeZone)
    if (d.getTime() > from.getTime()) return d
  }
  return fromZonedTime(`${y + 1}-01-01T00:00:00`, timeZone)
}

export function dayOffsetFromCreatedInTimeZone(
  createdAt: Date,
  offsetDays: number,
  timeZone: string
): Date | null {
  if (!createdAt || Number.isNaN(createdAt.getTime())) return null
  const baseYmd = formatInTimeZone(createdAt, timeZone, 'yyyy-MM-dd')
  const targetYmd = addDaysToYmdInTz(baseYmd, offsetDays, timeZone)
  return fromZonedTime(`${targetYmd}T12:00:00`, timeZone)
}

export function nextIntervalInTimeZone(
  anchor: Date,
  from: Date,
  intervalDays: number,
  timeZone: string
): Date {
  const anchorYmd = formatInTimeZone(anchor, timeZone, 'yyyy-MM-dd')
  let ymd = anchorYmd
  const fromTs = from.getTime()
  for (let guard = 0; guard < 1000; guard++) {
    const noon = fromZonedTime(`${ymd}T12:00:00`, timeZone)
    if (noon.getTime() > fromTs) return noon
    ymd = addDaysToYmdInTz(ymd, intervalDays, timeZone)
  }
  return fromZonedTime(`${ymd}T12:00:00`, timeZone)
}

// --- Cron: user-local windows ---

/** True during user's local Monday 00:00–00:59 (hour 0). */
export function shouldRunWeeklyInsightForUser(now: Date, timeZone: string): boolean {
  const h = parseInt(formatInTimeZone(now, timeZone, 'H'), 10)
  return getLocalDayOfWeekSun0(now, timeZone) === 1 && h === 0
}

/** Previous ISO week Mon–Sun (yyyy-MM-dd) in user TZ; call when weekly job runs on Monday local. */
export function getPreviousIsoWeekRangeYmdInTimeZone(
  now: Date,
  timeZone: string
): { weekStart: string; weekEnd: string } {
  const todayYmd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const yesterdayYmd = addDaysToYmdInTz(todayYmd, -1, timeZone)
  const weekEnd = yesterdayYmd
  const weekStart = addDaysToYmdInTz(weekEnd, -6, timeZone)
  return { weekStart, weekEnd }
}

/** Last completed ISO week Mon–Sun in user TZ (for any `now`). */
export function getLastCompletedIsoWeekRangeYmdInTimeZone(
  now: Date,
  timeZone: string
): { weekStart: string; weekEnd: string } {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const noon = fromZonedTime(`${ymd}T12:00:00`, timeZone)
  const dow = getLocalDayOfWeekSun0(noon, timeZone)
  const daysSinceMonday = dow === 0 ? 6 : dow - 1
  const thisMondayYmd = addDaysToYmdInTz(ymd, -daysSinceMonday, timeZone)
  const weekStart = addDaysToYmdInTz(thisMondayYmd, -7, timeZone)
  const weekEnd = addDaysToYmdInTz(weekStart, 6, timeZone)
  return { weekStart, weekEnd }
}

/** Legacy narrow window: local 1st at 00:00 only. Prefer `isUserLocalFirstCalendarDayOfMonth` for crons. */
export function shouldRunMonthlyInsightForUser(now: Date, timeZone: string): boolean {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const d = parseInt(ymd.split('-')[2], 10)
  const h = parseInt(formatInTimeZone(now, timeZone, 'H'), 10)
  return d === 1 && h === 0
}

/** User's local calendar date is the 1st (any hour). */
export function isUserLocalFirstCalendarDayOfMonth(now: Date, timeZone: string): boolean {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  return parseInt(ymd.split('-')[2], 10) === 1
}

function lastDayOfMonthUtcCalendar(year: number, month1to12: number): number {
  const mi = month1to12 - 1
  return new Date(Date.UTC(year, mi + 1, 0)).getUTCDate()
}

/** Previous calendar month in user TZ (first run on user's 1st 00:00 local). */
export function getPreviousMonthRangeYmdInTimeZone(
  now: Date,
  timeZone: string
): { monthStart: string; monthEnd: string } {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const [y, m] = ymd.split('-').map(Number)
  let pm = m - 1
  let py = y
  if (pm < 1) {
    pm = 12
    py -= 1
  }
  const ld = lastDayOfMonthUtcCalendar(py, pm)
  const monthStart = `${py}-${String(pm).padStart(2, '0')}-01`
  const monthEnd = `${py}-${String(pm).padStart(2, '0')}-${String(ld).padStart(2, '0')}`
  return { monthStart, monthEnd }
}

/** Legacy narrow window: quarter-start local days at 00:00 only. Prefer `isUserLocalQuarterStartCalendarDay` for crons. */
export function shouldRunQuarterlyInsightForUser(now: Date, timeZone: string): boolean {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const [, m, d] = ymd.split('-').map(Number)
  const h = parseInt(formatInTimeZone(now, timeZone, 'H'), 10)
  const quarterStarts = [1, 4, 7, 10]
  return d === 1 && quarterStarts.includes(m) && h === 0
}

/** Jan 1 / Apr 1 / Jul 1 / Oct 1 in user TZ (any hour). */
export function isUserLocalQuarterStartCalendarDay(now: Date, timeZone: string): boolean {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const [, m, d] = ymd.split('-').map(Number)
  const quarterStarts = [1, 4, 7, 10]
  return d === 1 && quarterStarts.includes(m)
}

export function getPreviousQuarterRangeYmdInTimeZone(
  now: Date,
  timeZone: string
): { quarterStart: string; quarterEnd: string } | null {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const [y, m] = ymd.split('-').map(Number)

  if (m === 1) {
    const py = y - 1
    const qEnd = lastDayOfMonthUtcCalendar(py, 12)
    return {
      quarterStart: `${py}-10-01`,
      quarterEnd: `${py}-12-${String(qEnd).padStart(2, '0')}`,
    }
  }
  if (m === 4) {
    const ld = lastDayOfMonthUtcCalendar(y, 3)
    return { quarterStart: `${y}-01-01`, quarterEnd: `${y}-03-${String(ld).padStart(2, '0')}` }
  }
  if (m === 7) {
    const ld = lastDayOfMonthUtcCalendar(y, 6)
    return { quarterStart: `${y}-04-01`, quarterEnd: `${y}-06-${String(ld).padStart(2, '0')}` }
  }
  if (m === 10) {
    const ld = lastDayOfMonthUtcCalendar(y, 9)
    return { quarterStart: `${y}-07-01`, quarterEnd: `${y}-09-${String(ld).padStart(2, '0')}` }
  }
  return null
}
