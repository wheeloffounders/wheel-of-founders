import { formatInTimeZone } from 'date-fns-tz'

/** UTC-based quarter id for quarterly insight batch waves (yyyy-Q1..Q4). */
export function getUtcIsoQuarterId(now: Date): string {
  const y = formatInTimeZone(now, 'UTC', 'yyyy')
  const m = parseInt(formatInTimeZone(now, 'UTC', 'M'), 10)
  const q = Math.ceil(m / 3)
  return `${y}-Q${q}`
}
