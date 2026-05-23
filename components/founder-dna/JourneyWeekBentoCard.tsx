'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { JourneyWeekRecord } from '@/lib/founder-dna/journey-week-records'
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
}

export function JourneyWeekBentoCard({ record, accentIndex = 0 }: JourneyWeekBentoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const topAccent = TOP_ACCENTS[accentIndex % TOP_ACCENTS.length]
  const hasExpandable = record.fullLog.length > 0 && record.fullLog !== record.themeTitle

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

      {record.highlights.length > 0 ? (
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

      {hasExpandable ? (
        <>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-indigo-600 hover:underline dark:text-indigo-400"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Collapse log' : 'Expand log'}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          </button>
          {expanded ? (
            <div
              id={panelId}
              className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200/60 bg-white/50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-600/50 dark:bg-gray-900/30 dark:text-gray-200"
            >
              {record.fullLog}
            </div>
          ) : null}
        </>
      ) : null}
    </JourneyBlueprintCard>
  )
}
