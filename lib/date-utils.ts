/**
 * Date utilities for scheduled insight generation.
 * Week starts Monday (ISO 8601).
 */
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns'

/** Get the Monday of the previous week (last completed week) */
export function getLastMonday(): Date {
  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  return subWeeks(thisWeekStart, 1)
}

/** Get the Sunday of the previous week */
export function getLastSunday(): Date {
  const lastMon = getLastMonday()
  return endOfWeek(lastMon, { weekStartsOn: 1 })
}

/** Get first day of previous month */
export function getFirstDayOfLastMonth(): Date {
  const now = new Date()
  return startOfMonth(subMonths(now, 1))
}

/** Get last day of previous month */
export function getLastDayOfLastMonth(): Date {
  const now = new Date()
  return endOfMonth(subMonths(now, 1))
}

/** Get first day of previous quarter */
export function getQuarterStart(): Date {
  const now = new Date()
  return startOfQuarter(subQuarters(now, 1))
}

/** Get last day of previous quarter */
export function getQuarterEnd(): Date {
  const now = new Date()
  return endOfQuarter(subQuarters(now, 1))
}

/** Format date as yyyy-MM-dd */
export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Format week range for display: "Feb 16, 2026 – Feb 22, 2026" */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = endOfWeek(start, { weekStartsOn: 1 })
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

/** Format month range for display: "February 2026" */
export function formatMonthRange(monthStart: string): string {
  const d = new Date(monthStart)
  return format(d, 'MMMM yyyy')
}

/** Format quarter range for display: "Q1 2026". Accepts YYYY-MM-DD or YYYY-Q# */
export function formatQuarterRange(quarterStart: string): string {
  let d: Date
  const m = quarterStart.match(/^(\d{4})-Q([1-4])$/)
  if (m) {
    const year = parseInt(m[1], 10)
    const qNum = parseInt(m[2], 10)
    d = new Date(year, (qNum - 1) * 3, 1)
  } else {
    d = new Date(quarterStart)
  }
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `Q${q} ${d.getFullYear()}`
}
