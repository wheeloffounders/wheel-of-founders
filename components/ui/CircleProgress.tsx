'use client'

import { colors } from '@/lib/design-tokens'

export interface CircleProgressProps {
  current: number
  target: number
  size?: number
  strokeWidth?: number
  /** Shown under the ring (e.g. `days with entries`). */
  unitLabel?: string
  className?: string
}

export function CircleProgress({
  current,
  target,
  size = 80,
  strokeWidth = 6,
  unitLabel = 'days',
  className = '',
}: CircleProgressProps) {
  const safeTarget = Math.max(1, Math.floor(target))
  const safeCurrent = Math.max(0, Math.floor(current))
  const percentage = Math.min(100, Math.max(0, (safeCurrent / safeTarget) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const cx = size / 2
  const cy = size / 2

  return (
    <div
      className={`flex flex-col items-center scale-[0.92] sm:scale-100 origin-center ${className}`.trim()}
      role="img"
      aria-label={`${Math.round(percentage)} percent progress, ${safeCurrent} of ${safeTarget} ${unitLabel}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          className="dark:stroke-slate-700"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={colors.coral.DEFAULT}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
        <text
          x={cx}
          y={cy}
          dominantBaseline="central"
          textAnchor="middle"
          fontSize={size * 0.2}
          fill="currentColor"
          className="font-medium text-gray-900 dark:text-white"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center tabular-nums">
        {safeCurrent}/{safeTarget} {unitLabel}
      </p>
    </div>
  )
}
