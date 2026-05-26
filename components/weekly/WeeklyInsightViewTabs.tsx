'use client'

import { cn } from '@/components/ui/utils'

export type WeeklyInsightView = 'week' | 'archive'

type WeeklyInsightViewTabsProps = {
  activeView: WeeklyInsightView
  onViewChange: (view: WeeklyInsightView) => void
}

const TABS: { id: WeeklyInsightView; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'archive', label: 'Past chapters' },
]

export function WeeklyInsightViewTabs({ activeView, onViewChange }: WeeklyInsightViewTabsProps) {
  return (
    <div
      className="inline-flex rounded-full border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-600/60 dark:bg-gray-900/40"
      role="tablist"
      aria-label="Weekly insight views"
    >
      {TABS.map((tab) => {
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              'rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-colors',
              isActive
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
