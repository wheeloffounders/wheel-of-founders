'use client'

import { Check, Lock } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface ProgressCircleProps {
  current: number
  required: number
  size?: 'sm' | 'md' | 'lg'
  showFraction?: boolean
}

const SIZES = {
  sm: { outer: 36, stroke: 3, fontSize: 10 },
  md: { outer: 48, stroke: 4, fontSize: 12 },
  lg: { outer: 64, stroke: 5, fontSize: 16 },
}

export function ProgressCircle({
  current,
  required,
  size = 'md',
  showFraction = true,
}: ProgressCircleProps) {
  const { outer, stroke, fontSize } = SIZES[size]
  const radius = (outer - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const isUnlocked = current >= required
  const percentage = Math.min(100, (current / required) * 100)
  const dashOffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: outer, height: outer }}>
      <svg
        width={outer}
        height={outer}
        className="transform -rotate-90"
        aria-hidden
      >
        {/* Background circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-600"
        />
        {/* Progress circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke={isUnlocked ? colors.emerald.DEFAULT : colors.coral.DEFAULT}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isUnlocked ? 0 : dashOffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center content */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize }}
      >
        {isUnlocked ? (
          <span className="text-emerald-600 dark:text-emerald-400" title="Unlocked">
            <Check className="w-[0.6em] h-[0.6em]" strokeWidth={3} />
          </span>
        ) : showFraction ? (
          <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
            {current}/{required}
          </span>
        ) : (
          <Lock className="w-[0.5em] h-[0.5em] text-gray-500 dark:text-gray-400" strokeWidth={2} />
        )}
      </div>
    </div>
  )
}
