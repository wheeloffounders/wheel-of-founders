'use client'

import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'
import { ProgressCircle } from './ProgressCircle'
import { MrsDeerAvatar } from './MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

interface LockedFeatureProps {
  type: 'monthly' | 'quarterly'
  progress: { current: number; required: number }
}

const CONFIG = {
  monthly: {
    title: 'Monthly Insight',
    description: 'This feature unlocks after 15 days of consistent use within the last 30 days.',
    daysLabel: 'days with morning plans or evening reviews',
  },
  quarterly: {
    title: 'Quarterly Trajectory',
    description: 'This feature unlocks after 45 days of consistent use within the last 90 days.',
    daysLabel: 'days with morning plans or evening reviews',
  },
}

export function LockedFeature({ type, progress }: LockedFeatureProps) {
  const config = CONFIG[type]
  const daysRemaining = Math.max(0, progress.required - progress.current)

  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="mb-6 flex justify-center">
        <div className="rounded-full p-4 bg-gray-100 dark:bg-gray-800">
          <Lock className="w-12 h-12 text-gray-400 dark:text-gray-500" />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        {config.title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {config.description}
      </p>

      <div className="flex justify-center mb-6">
        <ProgressCircle current={progress.current} required={progress.required} size="lg" showFraction />
      </div>

      <p className="text-gray-700 dark:text-gray-300 mb-2">
        You&apos;re <strong>{progress.current}/{progress.required}</strong> {config.daysLabel}.
      </p>
      {daysRemaining > 0 && (
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Keep going! <strong>{daysRemaining}</strong> more {daysRemaining === 1 ? 'day' : 'days'} and this feature unlocks.
        </p>
      )}

      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="flex items-start gap-3 max-w-sm text-left bg-[#f8f4f0] dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <MrsDeerAvatar expression="encouraging" size="medium" className="flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            &quot;Consistency beats intensity. A few minutes each morning and evening add up—you&apos;re building something real.&quot;
          </p>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: colors.navy.DEFAULT }}
      >
        <ArrowLeft className="w-4 h-4" />
        View Dashboard
      </Link>
    </div>
  )
}
