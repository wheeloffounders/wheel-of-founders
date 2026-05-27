import { formatInTimeZone } from 'date-fns-tz'

/** UTC calendar month id for monthly insight batch waves (yyyy-MM). */
export function getUtcIsoMonthId(now: Date): string {
  return formatInTimeZone(now, 'UTC', 'yyyy-MM')
}

/**
 * One batch wave id for the global monthly cron window (UTC days 28–31 10:00 → day 2 09:59).
 * APAC local 1st 00:xx often falls on UTC prior-month day 28–31; Americas on UTC day 1–2.
 */
export function getMonthlyInsightBatchMonthId(now: Date): string {
  const ymd = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd')
  const [y, m, d] = ymd.split('-').map(Number)

  if (d <= 2) {
    return `${y}-${String(m).padStart(2, '0')}`
  }

  if (d >= 28) {
    let nm = m + 1
    let ny = y
    if (nm > 12) {
      nm = 1
      ny += 1
    }
    return `${ny}-${String(nm).padStart(2, '0')}`
  }

  return getUtcIsoMonthId(now)
}
