'use client'

import { Sparkles } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import Link from 'next/link'
import { ProgressCircle } from './ProgressCircle'
import { MrsDeerAvatar } from './MrsDeerAvatar'
import { useProgress } from '@/lib/hooks/useProgress'
import { colors } from '@/lib/design-tokens'
import { getProgressStatus } from '@/lib/format-progress'
import {
  MONTHLY_INSIGHT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'

function insightLabel(type: 'weekly' | 'monthly' | 'quarterly') {
  if (type === 'weekly') return 'Weekly Insight'
  if (type === 'monthly') return 'Monthly Insight'
  return 'Quarterly Trajectory'
}

export function DashboardProgress() {
  const { weekly, monthly, quarterly, nextUnlock, loading } = useProgress()

  if (loading || (!weekly && !monthly && !quarterly)) return null
  if (weekly?.isUnlocked && monthly?.isUnlocked && quarterly?.isUnlocked) return null

  const wUnlocked = weekly?.isUnlocked ?? false
  const mUnlocked = monthly?.isUnlocked ?? false
  const qUnlocked = quarterly?.isUnlocked ?? false
  const nextUnlockStatus =
    nextUnlock != null ? getProgressStatus(nextUnlock.progress.current, nextUnlock.progress.required) : null

  return (
    <div data-tour="insight-unlocks" className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Your Progress
        </h2>
        <InfoTooltip text="Weekly, monthly, and quarterly insight pages unlock after enough days with entries (days you saved a morning plan or completed an evening review). After unlock, insights follow the normal Monday / 1st-of-month / quarter-start schedules." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50">
          <ProgressCircle
            current={weekly?.current ?? 0}
            required={weekly?.required ?? WEEKLY_INSIGHT_MIN_DAYS}
            size="md"
            showFraction
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">Weekly Insight</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {wUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400">Unlocked</span>
              ) : (
                <>
                  {weekly?.current ?? 0}/{weekly?.required ?? WEEKLY_INSIGHT_MIN_DAYS} days with entries
                </>
              )}
            </p>
          </div>
          {!wUnlocked && (
            <Link href="/weekly" className="text-xs font-medium shrink-0" style={{ color: colors.coral.DEFAULT }}>
              View →
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50">
          <ProgressCircle
            current={monthly?.current ?? 0}
            required={monthly?.required ?? MONTHLY_INSIGHT_MIN_DAYS}
            size="md"
            showFraction
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">Monthly Insight</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400">Unlocked</span>
              ) : (
                <>
                  {monthly?.current ?? 0}/{monthly?.required ?? MONTHLY_INSIGHT_MIN_DAYS} days with entries
                </>
              )}
            </p>
          </div>
          {!mUnlocked && (
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
              {qUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400">Unlocked</span>
              ) : (
                <>
                  {quarterly?.current ?? 0}/{quarterly?.required ?? QUARTERLY_INSIGHT_MIN_DAYS} days with entries
                </>
              )}
            </p>
          </div>
          {!qUnlocked && (
            <Link href="/quarterly" className="text-xs font-medium shrink-0" style={{ color: colors.coral.DEFAULT }}>
              View →
            </Link>
          )}
        </div>
      </div>

      {nextUnlock && nextUnlockStatus && nextUnlockStatus.status !== 'ready' && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f4f0] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <MrsDeerAvatar expression="encouraging" size="medium" className="flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Next unlock: {insightLabel(nextUnlock.type)}{` `}
              {nextUnlockStatus.status === 'not_started' ? '— Start today to unlock' : `in ${nextUnlockStatus.label}`}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Each day you show up counts toward opening deeper insight pages.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
