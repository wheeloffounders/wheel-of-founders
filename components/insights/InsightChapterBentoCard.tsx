'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText'
import { JourneyBlueprintCard } from '@/components/founder-dna/JourneyBlueprintCard'
import { cn } from '@/components/ui/utils'
import { INSIGHT_CHAPTER_BODY_MIN_CHARS, type InsightChapterRecord } from '@/lib/insights/insight-chapter-records'

type InsightChapterBentoCardProps = {
  record: InsightChapterRecord
  contextLabel: string
  locked: boolean
  onOpenPeriod?: (periodKey: string) => void
}

export function InsightChapterBentoCard({
  record,
  contextLabel,
  locked,
  onOpenPeriod,
}: InsightChapterBentoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()

  const hasExpandable = record.bodyLog.length >= INSIGHT_CHAPTER_BODY_MIN_CHARS
  const showExpandControl = hasExpandable && !locked

  return (
    <JourneyBlueprintCard
      as="article"
      topAccentClassName="bg-indigo-400/80"
      aria-labelledby={`${panelId}-title`}
      data-period-key={record.periodKey}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {contextLabel}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{record.periodLabel}</p>
      <h3
        id={`${panelId}-title`}
        className="mt-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white"
      >
        {record.themeTitle}
      </h3>

      {locked ? (
        <div className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-gray-300">
          <p>
            Open this period to read your reflection teaser. Pro unlocks the full chapter letter in the archive.
          </p>
          {onOpenPeriod ? (
            <button
              type="button"
              onClick={() => onOpenPeriod(record.periodKey)}
              className="mt-3 inline-flex items-center rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-900 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-100"
            >
              Open this period →
            </button>
          ) : null}
        </div>
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
          Mrs. Deer is still weaving this chapter.
        </p>
      )}

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
              <MarkdownText
                className="text-xs leading-relaxed text-slate-700 dark:text-gray-200 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4"
              >
                {record.bodyLog}
              </MarkdownText>
            </div>
          ) : null}
        </>
      ) : null}
    </JourneyBlueprintCard>
  )
}

