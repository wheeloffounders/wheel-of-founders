'use client'

import * as React from 'react'
import { cn } from './utils'
import { colors } from '@/lib/design-tokens'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', style, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-none border-2 px-4 py-3 text-base',
          'focus:outline-none focus:ring-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          className
        )}
        style={{
          borderColor: isFocused ? colors.coral.DEFAULT : colors.navy.DEFAULT,
          backgroundColor: colors.neutral.card,
          ...style,
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
