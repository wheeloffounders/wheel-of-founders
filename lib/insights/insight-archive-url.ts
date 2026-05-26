export const INSIGHT_ARCHIVE_VIEW = 'archive' as const

export type InsightPeriodParam = 'weekStart' | 'month' | 'quarter'

const PERIOD_BASE: Record<InsightPeriodParam, string> = {
  weekStart: '/weekly',
  month: '/monthly-insight',
  quarter: '/quarterly',
}

/** Past chapters tab with a selected period in the URL. */
export function insightArchiveHref(periodParam: InsightPeriodParam, periodKey: string): string {
  const params = new URLSearchParams({ view: INSIGHT_ARCHIVE_VIEW, [periodParam]: periodKey })
  return `${PERIOD_BASE[periodParam]}?${params.toString()}`
}

/** This week / month / quarter view for a specific period. */
export function insightPeriodHref(periodParam: InsightPeriodParam, periodKey: string): string {
  const params = new URLSearchParams({ [periodParam]: periodKey })
  return `${PERIOD_BASE[periodParam]}?${params.toString()}`
}
