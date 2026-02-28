'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { BookOpen, Award, Lightbulb, Heart, Check } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export function Step4Evening() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="empathetic" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion</p>
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: colors.navy.DEFAULT }}>
        Evening Reflection
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        Close the loop each day. Here&apos;s what you&apos;ll capture:
      </p>
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.navy.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Journal</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">What mattered most? What would you carry forward?</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Award className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.emerald.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Wins & Lessons</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Celebrate what worked. Note what you&apos;d do differently.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Heart className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Mood & Energy</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quick check-in—no judgment, just awareness.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.emerald.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Morning tasks sync</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mark your Power List items complete. See your progress.</p>
          </div>
        </li>
      </ul>
    </div>
  )
}
