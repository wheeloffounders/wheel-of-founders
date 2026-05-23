import { format, parseISO } from 'date-fns'
import { getWeeklyJourneyMessage, journeyWeekNumberFromDaysWithEntries } from '@/lib/email/weekly-journey-messages'

export type JourneyWeekRecordSource = {
  weekStart: string
  weekEnd: string
  insightText: string | null
}

export type JourneyWeekRecord = {
  weekStart: string
  weekEnd: string
  weekNumber: number
  periodLabel: string
  themeTitle: string
  highlights: string[]
  fullLog: string
}

const BULLET_LINE = /^[\s•\-*–—]+\s*/

function linesFromInsight(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_LINE, '').trim()
}

/** Pull 2–3 scannable highlights + remainder as full log. */
export function parseWeeklyInsightForBento(insightText: string | null, weekNumber: number): {
  themeTitle: string
  highlights: string[]
  fullLog: string
} {
  const fallbackTheme = getWeeklyJourneyMessage(weekNumber)
  if (!insightText?.trim()) {
    return { themeTitle: fallbackTheme, highlights: [], fullLog: '' }
  }

  const lines = linesFromInsight(insightText)
  const bulletLines = lines.filter((l) => BULLET_LINE.test(l) || l.startsWith('•'))
  const proseLines = lines.filter((l) => !BULLET_LINE.test(l) && !l.startsWith('•'))

  const themeTitle =
    proseLines[0]?.length && proseLines[0].length < 120
      ? proseLines[0].replace(/^#+\s*/, '')
      : fallbackTheme

  const highlightSource =
    bulletLines.length > 0
      ? bulletLines.map(stripBulletPrefix)
      : proseLines.slice(themeTitle === proseLines[0] ? 1 : 0)

  const highlights = highlightSource.filter(Boolean).slice(0, 3)
  const fullLog = insightText.trim()

  return { themeTitle, highlights, fullLog }
}

export function buildJourneyWeekRecords(
  rows: JourneyWeekRecordSource[],
  daysWithEntries: number,
): JourneyWeekRecord[] {
  const sorted = [...rows].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
  const baseWeek = journeyWeekNumberFromDaysWithEntries(daysWithEntries)

  return sorted.map((row, index) => {
    const safeWeekNumber = Math.max(1, baseWeek - index)
    const { themeTitle, highlights, fullLog } = parseWeeklyInsightForBento(row.insightText, safeWeekNumber)

    let periodLabel = row.weekStart
    try {
      const start = parseISO(row.weekStart)
      const end = parseISO(row.weekEnd)
      periodLabel = `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    } catch {
      /* keep iso */
    }

    return {
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
      weekNumber: safeWeekNumber,
      periodLabel,
      themeTitle,
      highlights,
      fullLog,
    }
  })
}
