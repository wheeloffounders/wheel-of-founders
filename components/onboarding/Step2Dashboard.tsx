'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { Sun, Moon, Flame, Target, BarChart2 } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export function Step2Dashboard() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="thoughtful" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion</p>
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: colors.navy.DEFAULT }}>
        Your Dashboard
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        This is your command center. Here&apos;s what you&apos;ll find:
      </p>
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <Target className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Today&apos;s Intention</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your key decision from the morning—keeps you focused.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <BarChart2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Quick stats</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Streak, tasks completed, and action mix.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex gap-2 mt-0.5">
            <Sun className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            <Moon className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Morning & Evening & Emergency</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your daily loop—plan, reflect, handle fires.</p>
          </div>
        </li>
      </ul>
    </div>
  )
}
