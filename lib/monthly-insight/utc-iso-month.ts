import { formatInTimeZone } from 'date-fns-tz'

/** UTC calendar month id for monthly insight batch waves (yyyy-MM). */
export function getUtcIsoMonthId(now: Date): string {
  return formatInTimeZone(now, 'UTC', 'yyyy-MM')
}
