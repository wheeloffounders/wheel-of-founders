'use client'

import { colors } from '@/lib/design-tokens'

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div className="w-full">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
        Step {current} of {total}
      </p>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: colors.coral.DEFAULT,
          }}
        />
      </div>
    </div>
  )
}
