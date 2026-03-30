'use client'

import * as React from 'react'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max: number
}

export function Progress({ value, max, className, ...props }: ProgressProps) {
  const safeMax = max > 0 ? max : 1
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100))

  return (
    <div className={`w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ${className ?? ''}`} {...props}>
      <div className="h-full bg-[#ef725c]" style={{ width: `${pct}%` }} />
    </div>
  )
}

