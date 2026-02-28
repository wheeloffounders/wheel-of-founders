'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

interface Step1WelcomeProps {
  preferredName: string | null
}

export function Step1Welcome({ preferredName }: Step1WelcomeProps) {
  const displayName = preferredName?.trim() || 'Founder'
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="welcoming" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion · Quiet Founder Coach</p>
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: colors.navy.DEFAULT }}>
        Welcome, {displayName}
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        I&apos;m Mrs. Deer, your AI companion—your quiet coach in the background. The app personalizes to you based on your goals—so the more you use it, the more it fits.
      </p>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        We&apos;ll help you move from scattered days to a clear, repeatable rhythm. This isn&apos;t about doing more—it&apos;s about doing what actually matters.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        Let&apos;s walk through the key features together.
      </p>
    </div>
  )
}
