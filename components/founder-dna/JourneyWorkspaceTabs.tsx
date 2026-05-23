'use client'

import { cn } from '@/components/ui/utils'

export type JourneyWorkspaceTab = 'roadmap' | 'achievements'

type JourneyWorkspaceTabsProps = {
  activeTab: JourneyWorkspaceTab
  onTabChange: (tab: JourneyWorkspaceTab) => void
}

const TABS: { id: JourneyWorkspaceTab; label: string }[] = [
  { id: 'roadmap', label: 'The Roadmap' },
  { id: 'achievements', label: 'The Trophy Room' },
]

export function JourneyWorkspaceTabs({ activeTab, onTabChange }: JourneyWorkspaceTabsProps) {
  return (
    <div
      className="mb-8 inline-flex rounded-full border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-600/60 dark:bg-gray-900/40"
      role="tablist"
      aria-label="Journey views"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'rounded-full px-4 py-2 font-mono text-xs tracking-wider transition-colors',
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
