'use client'

import * as React from 'react'
import { cn } from './utils'
import { colors } from '@/lib/design-tokens'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoExpand?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, autoExpand = true, onInput, onChange, value, defaultValue, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null)
    const mergedRef = (el: HTMLTextAreaElement | null) => {
      internalRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    }

    const resize = React.useCallback((el: HTMLTextAreaElement | null) => {
      if (!el || !autoExpand) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 400) + 'px'
      el.style.overflowY = el.scrollHeight > 400 ? 'auto' : 'hidden'
    }, [autoExpand])

    React.useEffect(() => {
      if (autoExpand && internalRef.current) resize(internalRef.current)
    }, [value ?? defaultValue, autoExpand, resize])

    const handleInput = (e: 
React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoExpand) resize(e.target as HTMLTextAreaElement)
      // Call both onChange and onInput if needed
      onChange?.(e)
      if (onInput) {
        ;(e as any).type = 'input'
        onInput(e as any)
      }
    }
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoExpand) resize(e.target)
      onChange?.(e)
    }

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border px-4 py-3 text-base resize-none',
          'focus:outline-none focus:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          className
        )}
        style={{
          borderColor: isFocused ? colors.coral.DEFAULT : colors.neutral.border,
          borderWidth: isFocused ? '2px' : '1px',
          backgroundColor: colors.neutral.card,
          fontSize: '16px',
          lineHeight: '1.6',
          overflowY: 'hidden',
          ...style,
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        ref={mergedRef}
        onChange={handleChange}
        {...(value !== undefined ? { value } : { defaultValue })}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
