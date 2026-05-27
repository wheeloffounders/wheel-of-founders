import { formatInTimeZone } from 'date-fns-tz'

/** UTC-based quarter id for quarterly insight batch waves (yyyy-Q1..Q4). */
export function getUtcIsoQuarterId(now: Date): string {
  const y = formatInTimeZone(now, 'UTC', 'yyyy')
  const m = parseInt(formatInTimeZone(now, 'UTC', 'M'), 10)
  const q = Math.ceil(m / 3)
  return `${y}-Q${q}`
}

/**
 * One batch wave id for the global quarterly cron window (same UTC span as monthly).
 * Quarter-start local midnights (Jan/Apr/Jul/Oct 1) share one wave per incoming quarter.
 */
export function getQuarterlyInsightBatchQuarterId(now: Date): string {
  const ymd = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd')
  const [y, m, d] = ymd.split('-').map(Number)

  if (d <= 2) {
    const q = Math.ceil(m / 3)
    return `${y}-Q${q}`
  }

  if (d >= 28) {
    let nm = m + 1
    let ny = y
    if (nm > 12) {
      nm = 1
      ny += 1
    }
    const q = Math.ceil(nm / 3)
    return `${ny}-Q${q}`
  }

  return getUtcIsoQuarterId(now)
}
