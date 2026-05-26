'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText'
import {
  JOURNEY_WEEK_BODY_LOG_MIN_CHARS,
  type JourneyWeekRecord,
} from '@/lib/founder-dna/journey-week-records'
import { JourneyBlueprintCard } from '@/components/founder-dna/JourneyBlueprintCard'
import { cn } from '@/components/ui/utils'

const TOP_ACCENTS = [
  'bg-indigo-400/80',
  'bg-teal-400/70',
  'bg-[#ef725c]/75',
  'bg-amber-400/70',
] as const

type JourneyWeekBentoCardProps = {
  record: JourneyWeekRecord
  accentIndex?: number
  /** Same gate as Weekly Insight AI synthesis — no narrative slices on free. */
  weeklyNarrativeLocked?: boolean
  /** When set (e.g. on Weekly archive), open that week instead of inline link copy. */
  onOpenWeek?: (weekStart: string) => void
}

export function JourneyWeekBentoCard({
  record,
  accentIndex = 0,
  weeklyNarrativeLocked = false,
  onOpenWeek,
}: JourneyWeekBentoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const topAccent = TOP_ACCENTS[accentIndex % TOP_ACCENTS.length]
  const hasExpandable = record.bodyLog.length >= JOURNEY_WEEK_BODY_LOG_MIN_CHARS
  const showExpandControl = hasExpandable && !weeklyNarrativeLocked

  return (
    <JourneyBlueprintCard
      as="article"
      topAccentClassName={topAccent}
      aria-labelledby={`${panelId}-title`}
      data-week-start={record.weekStart}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Week {record.weekNumber}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{record.periodLabel}</p>
      <h3
        id={`${panelId}-title`}
        className="mt-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white"
      >
        {record.themeTitle}
      </h3>

      {weeklyNarrativeLocked ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-gray-300">
          {onOpenWeek ? (
            <>
              <button
                type="button"
                onClick={() => onOpenWeek(record.weekStart)}
                className="font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
              >
                Open this week
              </button>{' '}
              for stats and Mrs. Deer&apos;s reflection (Pro for the full letter).
            </>
          ) : (
            <>
              Mrs. Deer&apos;s weekly reflection for this chapter is on{' '}
              <Link
                href={`/weekly?weekStart=${record.weekStart}`}
                className="font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
              >
                Weekly Insight
              </Link>
              . Pro unlocks the full chapter archive.
            </>
          )}
        </p>
      ) : record.highlights.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {record.highlights.map((line) => (
            <li
              key={line.slice(0, 48)}
              className="text-xs leading-relaxed text-slate-600 dark:text-gray-300 pl-3 relative before:absolute before:left-0 before:top-[0.45em] before:h-1 before:w-1 before:rounded-full before:bg-slate-400/80"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-gray-400 italic">
          Mrs. Deer is still weaving this week&apos;s story.
        </p>
      )}

      {onOpenWeek && !weeklyNarrativeLocked ? (
        <button
          type="button"
          onClick={() => onOpenWeek(record.weekStart)}
          className="mt-3 inline-flex text-xs font-mono text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Open full week insight →
        </button>
      ) : null}

      {showExpandControl ? (
        <>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-indigo-600 hover:underline dark:text-indigo-400"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show less' : 'Continue reading'}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          </button>
          {expanded ? (
            <div
              id={panelId}
              className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200/60 bg-white/50 p-3 dark:border-slate-600/50 dark:bg-gray-900/30"
            >
              <MarkdownText className="text-xs leading-relaxed text-slate-700 dark:text-gray-200 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4">
                {record.bodyLog}
              </MarkdownText>
            </div>
          ) : null}
        </>
      ) : null}
    </JourneyBlueprintCard>
  )
}
