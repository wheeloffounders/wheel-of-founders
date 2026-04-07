'use client'

import { useMemo, useState } from 'react'
import { BADGE_DEFINITIONS, type BadgeCategory } from '@/lib/badges/badge-definitions'
import { getBadgeProgressForMilestones } from '@/lib/badges/badge-progress'
import {
  getBadgeJourneyTier,
  JOURNEY_TIER_LABELS,
  type JourneyVisualTier,
} from '@/lib/badges/badge-journey-tier'
import type { JourneyBadge, JourneyMilestones, JourneyUnlock } from '@/lib/types/founder-dna'

type BadgeGalleryProps = {
  badges: JourneyBadge[]
  /** When set, locked milestone badges show a coral progress bar */
  milestones?: JourneyMilestones | null
  /** Journey `nextUnlocks` rows whose `id` matches a badge `name` (e.g. founder_story) */
  nextUnlocks?: JourneyUnlock[]
}

function nextUnlockProgressForBadge(
  badgeName: string,
  nextUnlocks: JourneyUnlock[] | undefined
): { current: number; target: number } | null {
  if (!nextUnlocks?.length) return null
  const u = nextUnlocks.find((x) => x.id === badgeName)
  if (!u || u.target <= 0) return null
  if (u.progress >= u.target) return null
  return { current: Math.min(u.progress, u.target), target: u.target }
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  milestone: 'Milestone',
  discovery: 'Discovery',
  identity: 'Identity',
  behavior: 'Behavior',
  reflection: 'Reflection',
}

const TIER_ORDER: JourneyVisualTier[] = [1, 2, 3]

function tierCardClass(tier: JourneyVisualTier): string {
  switch (tier) {
    case 1:
      return 'border-amber-300/80 bg-gradient-to-b from-amber-50/90 to-white/70 dark:from-amber-950/25 dark:to-gray-900/40 dark:border-amber-800/50'
    case 2:
      return 'border-indigo-200/90 bg-gradient-to-b from-slate-50/95 to-white/70 dark:from-indigo-950/20 dark:to-gray-900/35 dark:border-indigo-800/40'
    case 3:
      return 'border-[#ef725c]/45 bg-gradient-to-b from-orange-50/50 to-amber-50/30 dark:from-[#ef725c]/10 dark:to-gray-900/30 dark:border-[#f0886c]/35'
    default:
      return 'border-gray-200/60 dark:border-gray-700/60'
  }
}

export function BadgeGallery({ badges, milestones, nextUnlocks = [] }: BadgeGalleryProps) {
  const [activeTab, setActiveTab] = useState<BadgeCategory>('milestone')
  const unlockedByName = useMemo(() => new Map(badges.map((b) => [b.name, b])), [badges])

  const rowsByTier = useMemo(() => {
    const rows = BADGE_DEFINITIONS.filter((b) => b.category === activeTab)
    const map: Record<JourneyVisualTier, typeof rows> = { 1: [], 2: [], 3: [] }
    for (const def of rows) {
      map[getBadgeJourneyTier(def.name)].push(def)
    }
    return map
  }, [activeTab])

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

      <div className="space-y-8">
        {TIER_ORDER.map((tier) => {
          const rows = rowsByTier[tier]
          if (rows.length === 0) return null
          const meta = JOURNEY_TIER_LABELS[tier]
          return (
            <section key={tier} aria-labelledby={`tier-${tier}-heading`}>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <div>
                  <h3 id={`tier-${tier}-heading`} className="text-xs font-bold uppercase tracking-wider text-[#152b50] dark:text-sky-200">
                    {meta.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{meta.subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map((def) => {
                  const unlocked = unlockedByName.get(def.name)
                  const progress = !unlocked
                    ? (milestones
                        ? getBadgeProgressForMilestones(def, milestones)
                        : null) ?? nextUnlockProgressForBadge(def.name, nextUnlocks)
                    : null
                  const pct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0
                  return (
                    <div
                      key={def.name}
                      className={`rounded-lg p-3 border ${tierCardClass(tier)} ${
                        unlocked
                          ? ''
                          : 'opacity-90'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-xl leading-none">{def.icon}</div>
                        <div className="min-w-0 flex-1">
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
                      {!unlocked && progress ? (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                            <span>Progress</span>
                            <span className="tabular-nums">
                              {progress.current}/{progress.target}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200/90 dark:bg-gray-700 overflow-hidden ring-1 ring-[#ef725c]/15">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#f0886c] to-[#ef725c] shadow-[0_0_14px_rgba(239,114,92,0.58)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
