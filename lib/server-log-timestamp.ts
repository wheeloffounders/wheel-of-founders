import { formatInTimeZone } from 'date-fns-tz'

/** Server log clock for debugging (API routes, cron). Not user-facing. */
const LOG_TIMEZONE = 'Asia/Hong_Kong'

/**
 * Prefix for server logs, e.g. `[14:32:01]`, in a fixed zone so terminal output is comparable
 * regardless of the machine's local TZ.
 */
export function getLogTimestamp(): string {
  return `[${formatInTimeZone(new Date(), LOG_TIMEZONE, 'HH:mm:ss')}]`
}
