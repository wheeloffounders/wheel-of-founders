'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackRadarEvent, type RadarSource } from '@/lib/radar'

/**
 * Blog / home interactive widgets: first pointer = intent start; call `markComplete()` at payoff.
 */
export function useBlogWidgetRadar(funnelId: string) {
  const pathname = usePathname()
  const source: RadarSource = pathname?.startsWith('/blog') ? 'blog' : 'home'

  const startDone = useRef(false)
  const onFirstPointer = useCallback(() => {
    if (startDone.current) return
    startDone.current = true
    trackRadarEvent(funnelId, 'start', source)
  }, [funnelId, source])

  const completeDone = useRef(false)
  const markComplete = useCallback(() => {
    if (completeDone.current) return
    completeDone.current = true
    trackRadarEvent(funnelId, 'complete', source)
  }, [funnelId, source])

  return { onFirstPointer, markComplete }
}

/** Fire complete once when `when` becomes true (e.g. summary phase). */
export function useRadarCompleteWhen(when: boolean, markComplete: () => void) {
  const sent = useRef(false)
  useEffect(() => {
    if (!when || sent.current) return
    sent.current = true
    markComplete()
  }, [when, markComplete])
}
