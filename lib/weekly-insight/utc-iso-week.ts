import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { addDaysToYmdInTz, getLocalDayOfWeekSun0 } from '@/lib/timezone'

/** Stable UTC calendar-day bucket for weekly insight batch waves (ISO week year + week). */
export function getUtcIsoWeekId(now: Date): string {
  return formatInTimeZone(now, 'UTC', "RRRR-'W'II")
}

/**
 * One batch wave id for the global weekly cron window (UTC Sunday 10:00 → Tuesday 09:59).
 * APAC local Monday 00:xx falls on UTC Sunday; Americas on UTC Monday — same wave id.
 */
export function getWeeklyInsightBatchWeekId(now: Date): string {
  const ymd = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd')
  const dowSun0 = getLocalDayOfWeekSun0(now, 'UTC')

  let mondayYmd: string
  if (dowSun0 === 0) {
    mondayYmd = addDaysToYmdInTz(ymd, 1, 'UTC')
  } else if (dowSun0 === 1) {
    mondayYmd = ymd
  } else {
    mondayYmd = addDaysToYmdInTz(ymd, -(dowSun0 - 1), 'UTC')
  }

  const anchor = fromZonedTime(`${mondayYmd}T12:00:00`, 'UTC')
  return formatInTimeZone(anchor, 'UTC', "RRRR-'W'II")
}
