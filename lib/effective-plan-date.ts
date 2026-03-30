import { format, subDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { addDaysToYmdInTz } from '@/lib/timezone'

/**
 * "Founder day" for dashboard tasks + evening deep-link: before 4am local time,
 * we still associate UI with the previous calendar day (plan you made "yesterday").
 */
export function getEffectivePlanDate(now: Date = new Date()): string {
  const hour = now.getHours()
  const d = hour < 4 ? subDays(now, 1) : now
  return format(d, 'yyyy-MM-dd')
}

/** Same founder-day rule, but evaluated in a specific IANA timezone. */
export function getEffectivePlanDateInTimeZone(
  timeZone: string,
  now: Date = new Date()
): string {
  const hour = parseInt(formatInTimeZone(now, timeZone, 'H'), 10)
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')
  const effective = hour < 4 ? addDaysToYmdInTz(ymd, -1, timeZone) : ymd
  if (process.env.NODE_ENV === 'development' && process.env.WOF_DEBUG_EFFECTIVE_DATE === '1') {
    console.info('[effective-plan-date]', {
      timeZone,
      nowIso: now.toISOString(),
      localYmd: ymd,
      localHour: hour,
      effectiveYmd: effective,
    })
  }
  return effective
}

/** Alias for readability at call sites that need YYYY-MM-DD. */
export function getPlanDateString(timeZone: string, now: Date = new Date()): string {
  return getEffectivePlanDateInTimeZone(timeZone, now)
}
