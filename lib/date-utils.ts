/**
 * Date utilities for scheduled insight generation and date navigation.
 * Week starts Monday (ISO 8601).
 */
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, isSameDay, addDays, eachDayOfInterval, isAfter } from 'date-fns'

/** Day completion status for navigator and calendar */
export type DayStatus = 'complete' | 'half' | 'empty' | 'future'

/** All dates in the given month (1–28/29/30/31) */
export function getMonthDays(month: Date): Date[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  return eachDayOfInterval({ start, end })
}

/** True if both dates are the same calendar day */
export function isSameCalendarDay(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2)
}

/** Format for header: "March 2026" */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy')
}

/** Derive status from morning/evening flags (for a single day). */
export function getDayStatusFromData(
  date: Date,
  hasMorning: boolean,
  hasEvening: boolean
): DayStatus {
  const today = new Date()
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (isAfter(dateOnly, todayOnly)) return 'future'
  if (hasMorning && hasEvening) return 'complete'
  if (hasMorning) return 'half'
  return 'empty'
}

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
