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
  /** Markdown shown on expand — excludes theme + highlight lines already on the card. */
  bodyLog: string
  /** Full saved insight (Pro teasers, exports). */
  fullLog: string
}

/** Minimum unique body length before we show an expand control. */
export const JOURNEY_WEEK_BODY_LOG_MIN_CHARS = 48

const BULLET_LINE = /^[\s•\-*–—]+\s*/

function linesFromInsight(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/** Plain text for card highlights — no raw Markdown tokens. */
function stripMarkdownDecorators(line: string): string {
  return line
    .replace(BULLET_LINE, '')
    .replace(/^#+\s*/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .trim()
}

function isBulletLine(line: string): boolean {
  return BULLET_LINE.test(line) || line.startsWith('•')
}

/** Pull 2–3 scannable highlights + non-overlapping body for expand. */
export function parseWeeklyInsightForBento(insightText: string | null, weekNumber: number): {
  themeTitle: string
  highlights: string[]
  bodyLog: string
  fullLog: string
} {
  const fallbackTheme = getWeeklyJourneyMessage(weekNumber)
  if (!insightText?.trim()) {
    return { themeTitle: fallbackTheme, highlights: [], bodyLog: '', fullLog: '' }
  }

  const lines = linesFromInsight(insightText)
  const bulletLines = lines.filter((l) => isBulletLine(l))
  const proseLines = lines.filter((l) => !isBulletLine(l))

  const rawThemeLine =
    proseLines[0]?.length && proseLines[0].length < 120 ? proseLines[0] : null
  const themeTitle = rawThemeLine ? stripMarkdownDecorators(rawThemeLine) : fallbackTheme

  const usedLineIndices = new Set<number>()
  if (rawThemeLine) {
    const themeIdx = lines.indexOf(rawThemeLine)
    if (themeIdx >= 0) usedLineIndices.add(themeIdx)
  }

  const highlightSource =
    bulletLines.length > 0
      ? bulletLines.map(stripMarkdownDecorators)
      : proseLines.slice(rawThemeLine ? 1 : 0).map(stripMarkdownDecorators)

  const highlights = highlightSource.filter(Boolean).slice(0, 3)

  if (bulletLines.length > 0) {
    let marked = 0
    for (let i = 0; i < lines.length && marked < 3; i++) {
      if (!isBulletLine(lines[i]!)) continue
      usedLineIndices.add(i)
      marked++
    }
  } else {
    let marked = 0
    for (let i = 0; i < lines.length && marked < 3; i++) {
      if (usedLineIndices.has(i) || isBulletLine(lines[i]!)) continue
      usedLineIndices.add(i)
      marked++
    }
  }

  const bodyLog = lines
    .filter((_, i) => !usedLineIndices.has(i))
    .join('\n')
    .trim()
  const fullLog = insightText.trim()

  return { themeTitle, highlights, bodyLog, fullLog }
}

export function buildJourneyWeekRecords(
  rows: JourneyWeekRecordSource[],
  daysWithEntries: number,
): JourneyWeekRecord[] {
  const sorted = [...rows].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
  const baseWeek = journeyWeekNumberFromDaysWithEntries(daysWithEntries)

  return sorted.map((row, index) => {
    const safeWeekNumber = Math.max(1, baseWeek - index)
    const { themeTitle, highlights, bodyLog, fullLog } = parseWeeklyInsightForBento(
      row.insightText,
      safeWeekNumber,
    )

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
      bodyLog,
      fullLog,
    }
  })
}
