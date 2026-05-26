'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/components/ui/utils'
import type { InsightChapterRecord } from '@/lib/insights/insight-chapter-records'

type InsightChapterNavProps = {
  contextLabel: string
  chapters: InsightChapterRecord[]
  loading: boolean
  activePeriodKey: string | null
  onSelectPeriod: (periodKey: string) => void
}

export function InsightChapterNav({
  contextLabel,
  chapters,
  loading,
  activePeriodKey,
  onSelectPeriod,
}: InsightChapterNavProps) {
  return (
    <nav className="rounded-xl border border-slate-200/80 bg-white/60 p-3 dark:border-slate-600/50 dark:bg-gray-900/30">
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
        Chapter history
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ef725c]" />
          Loading…
        </div>
      ) : chapters.length === 0 ? (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-gray-300">
          Completed {contextLabel.toLowerCase()} insights will appear here once Mrs. Deer has saved them.
        </p>
      ) : (
        <ul className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto pr-1">
          {chapters.map((c) => {
            const active = activePeriodKey === c.periodKey
            return (
              <li key={c.periodKey}>
                <button
                  type="button"
                  onClick={() => onSelectPeriod(c.periodKey)}
                  className={cn(
                    'w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100'
                      : 'text-slate-700 hover:bg-slate-100/80 dark:text-gray-200 dark:hover:bg-gray-800/50',
                  )}
                >
                  <span className="font-mono font-medium">{c.periodLabel}</span>
                  <span className="mt-0.5 block truncate text-[11px] opacity-80">{c.themeTitle}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}

