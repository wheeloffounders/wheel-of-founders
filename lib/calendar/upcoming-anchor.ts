import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { addDaysToYmdInTz, getLocalDayOfWeekSun0 } from '@/lib/timezone'

/** Monday = 1 (Sun0). First Monday on or after `from` in `timeZone` (for weekly RRULE BYDAY=MO). */
export function getUpcomingMondayAnchorInTimeZone(timeZone: string, from: Date = new Date()): Date {
  const tz = timeZone.trim() || 'UTC'
  let ymd = formatInTimeZone(from, tz, 'yyyy-MM-dd')
  for (let i = 0; i < 14; i++) {
    const noon = fromZonedTime(`${ymd}T12:00:00`, tz)
    if (getLocalDayOfWeekSun0(noon, tz) === 1) return noon
    ymd = addDaysToYmdInTz(ymd, 1, tz)
  }
  return from
}
