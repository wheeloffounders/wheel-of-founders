'use client'

import { Sparkles } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import Link from 'next/link'
import { ProgressCircle } from './ProgressCircle'
import { MrsDeerAvatar } from './MrsDeerAvatar'
import { useProgress } from '@/lib/hooks/useProgress'
import { colors } from '@/lib/design-tokens'

export function DashboardProgress() {
  const { monthly, quarterly, nextUnlock, loading } = useProgress()

  if (loading || (!monthly && !quarterly)) return null
  if (monthly?.isUnlocked && quarterly?.isUnlocked) return null

  const monthlyUnlocked = monthly?.isUnlocked ?? false
  const quarterlyUnlocked = quarterly?.isUnlocked ?? false

  return (
    <div data-tour="insight-unlocks" className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Your Progress
        </h2>
        <InfoTooltip text="Complete morning plans and evening reviews to unlock Monthly Insight and Quarterly Trajectory. Deeper insights unlock as you build consistency." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50">
          <ProgressCircle
            current={monthly?.current ?? 0}
            required={monthly?.required ?? 15}
            size="md"
            showFraction
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">Monthly Insight</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {monthlyUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400">Unlocked</span>
              ) : (
                <>
                  {monthly?.current ?? 0}/15 days in last 30
                </>
              )}
            </p>
          </div>
          {!monthlyUnlocked && (
            <Link
              href="/monthly-insight"
              className="text-xs font-medium shrink-0"
              style={{ color: colors.coral.DEFAULT }}
            >
              View →
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50">
          <ProgressCircle
            current={quarterly?.current ?? 0}
            required={quarterly?.required ?? 45}
            size="md"
            showFraction
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">Quarterly Trajectory</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {quarterlyUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400">Unlocked</span>
              ) : (
                <>
                  {quarterly?.current ?? 0}/45 days in last 90
                </>
              )}
            </p>
          </div>
          {!quarterlyUnlocked && (
            <Link
              href="/quarterly"
              className="text-xs font-medium shrink-0"
              style={{ color: colors.coral.DEFAULT }}
            >
              View →
            </Link>
          )}
        </div>
      </div>

      {nextUnlock && nextUnlock.daysRemaining > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f4f0] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <MrsDeerAvatar expression="encouraging" size="medium" className="flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Next unlock: {nextUnlock.type === 'monthly' ? 'Monthly Insight' : 'Quarterly Trajectory'} in {nextUnlock.daysRemaining} {nextUnlock.daysRemaining === 1 ? 'day' : 'days'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Keep adding morning plans or evening reviews to unlock deeper insights.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
