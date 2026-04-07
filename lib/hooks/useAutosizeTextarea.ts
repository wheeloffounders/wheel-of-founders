import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Grows a textarea with its content (no inner scroll). Use `resize-none overflow-hidden` on the element.
 */
export function useAutosizeTextarea(value: string, minRows = 1): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const cs = getComputedStyle(el)
    const lineHeight = parseFloat(cs.lineHeight) || 20
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    const minH = minRows * lineHeight + padY
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, minH)}px`
  }, [value, minRows])

  return ref
}
