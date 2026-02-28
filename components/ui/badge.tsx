'use client'

import * as React from 'react'
import { cn } from './utils'
import { colors } from '@/lib/design-tokens'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'coral' | 'amber' | 'emerald' | 'neutral'
}

const variantClassNames: Record<NonNullable<BadgeProps['variant']>, string> = {
  coral: 'bg-[#FFF0EC] text-[#EF725C] dark:bg-[#EF725C]/20 dark:text-[#F28771]',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  neutral: 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 dark:bg-gray-800 dark:text-gray-300',
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-4 py-2 text-sm font-medium',
          'transition-all duration-200',
          variantClassNames[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }
