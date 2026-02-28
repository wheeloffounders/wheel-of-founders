'use client'

import { useRef, useEffect, useCallback } from 'react'

interface AutoExpandTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string
  minRows?: number
  maxHeight?: number
}

export function AutoExpandTextarea({
  value = '',
  onInput,
  onChange,
  minRows = 1,
  maxHeight = 300,
  style,
  className = '',
  ...props
}: AutoExpandTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const minH = minRows * lineHeight
    const newHeight = Math.max(el.scrollHeight, minH)
    const capped = Math.min(newHeight, maxHeight)
    el.style.height = capped + 'px'
    el.style.overflowY = newHeight > maxHeight ? 'auto' : 'hidden'
  }, [minRows, maxHeight])

  useEffect(() => {
    resize(ref.current)
  }, [value, resize])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement
      resize(target)
      onChange?.(e)
      // Also call onInput if provided, with a cast
      if (onInput) {
        ;(e as any).type = 'input'
        onInput(e as any)
      }
    },
    [resize, onChange, onInput]
  )

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={handleChange}
      className={`resize-none ${className}`.trim()}
      style={style}
      {...props}
    />
  )
}
