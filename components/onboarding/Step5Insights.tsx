'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { Sparkles, Sun, Moon, Calendar } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export function Step5Insights() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="encouraging" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion</p>
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: colors.navy.DEFAULT }}>
        Mrs. Deer, your AI companion & Insights
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        I&apos;m your AI coach—quiet, warm, and focused on what matters. Here&apos;s how I show up:
      </p>
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <Sun className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.amber.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Post-morning insight</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">After you save your plan, I reflect on your focus and offer one gentle nudge.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Moon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.navy.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Post-evening insight</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">After your reflection, I notice patterns and offer perspective.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Weekly insights</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pattern recognition across your week—what&apos;s working, what&apos;s shifting.</p>
          </div>
        </li>
      </ul>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        Monthly and quarterly reflections unlock as you go deeper. No need to worry about those now.
      </p>
      <p className="text-gray-700 dark:text-gray-300 mt-4 font-medium" style={{ color: colors.coral.DEFAULT }}>
        The more you use the app, the smarter I get.
      </p>
    </div>
  )
}
