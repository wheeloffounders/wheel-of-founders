import { formatInTimeZone } from 'date-fns-tz'

/** Stable UTC calendar-day bucket for weekly insight batch waves (ISO week year + week). */
export function getUtcIsoWeekId(now: Date): string {
  return formatInTimeZone(now, 'UTC', "RRRR-'W'II")
}
