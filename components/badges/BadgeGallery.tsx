'use client'

import { useMemo, useState } from 'react'
import { BADGE_DEFINITIONS, type BadgeCategory } from '@/lib/badges/badge-definitions'
import type { JourneyBadge } from '@/lib/types/founder-dna'

type BadgeGalleryProps = {
  badges: JourneyBadge[]
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  milestone: 'Milestone',
  discovery: 'Discovery',
  identity: 'Identity',
  behavior: 'Behavior',
  reflection: 'Reflection',
}

export function BadgeGallery({ badges }: BadgeGalleryProps) {
  const [activeTab, setActiveTab] = useState<BadgeCategory>('milestone')
  const unlockedByName = useMemo(() => new Map(badges.map((b) => [b.name, b])), [badges])

  const rows = useMemo(
    () => BADGE_DEFINITIONS.filter((b) => b.category === activeTab),
    [activeTab],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_LABELS) as BadgeCategory[]).map((cat) => {
          const isActive = cat === activeTab
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                isActive
                  ? 'bg-[#ef725c] text-white border-[#ef725c]'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((def) => {
          const unlocked = unlockedByName.get(def.name)
          return (
            <div
              key={def.name}
              className={`rounded-lg p-3 border ${
                unlocked
                  ? 'bg-white/70 dark:bg-gray-800/40 border-gray-200/60 dark:border-gray-700/60'
                  : 'bg-gray-50/70 dark:bg-gray-900/40 border-gray-200/60 dark:border-gray-700/60 opacity-75'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="text-xl leading-none">{def.icon}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{def.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {unlocked ? def.description : def.unlockHint}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                {unlocked
                  ? `Unlocked ${new Date(unlocked.unlocked_at).toLocaleDateString()}`
                  : 'Locked'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
