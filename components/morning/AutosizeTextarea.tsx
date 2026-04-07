'use client'

import { forwardRef, useCallback } from 'react'
import { cn } from '@/components/ui/utils'
import { useAutosizeTextarea } from '@/lib/hooks/useAutosizeTextarea'

export type AutosizeTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'rows'
> & {
  minRows?: number
}

/**
 * Textarea that grows with content; no inner scroll (page scrolls).
 */
export const AutosizeTextarea = forwardRef<HTMLTextAreaElement, AutosizeTextareaProps>(
  function AutosizeTextarea({ value = '', minRows = 1, className, onChange, ...rest }, forwardedRef) {
    const autosizeRef = useAutosizeTextarea(typeof value === 'string' ? value : '', minRows)

    const setRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        ;(autosizeRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
        if (typeof forwardedRef === 'function') forwardedRef(el)
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
      },
      [autosizeRef, forwardedRef],
    )

    return (
      <textarea
        ref={setRef}
        value={value}
        onChange={onChange}
        rows={minRows}
        className={cn('resize-none overflow-hidden', className)}
        {...rest}
      />
    )
  },
)
