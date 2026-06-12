'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getOrCreatePageViewClientSessionId, trackPageView } from '@/lib/analytics-batch'

const DEBOUNCE_MS = 400

/**
 * Tracks page views on route change; batches to /api/analytics/batch-page-views.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const prevPathRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSend = useCallback((path: string) => {
    void (async () => {
      const { shouldSkipInternalAnalytics, isInternalAnalyticsPath } = await import(
        '@/lib/analytics/skip-internal-analytics'
      )
      if (isInternalAnalyticsPath(path)) return
      if (await shouldSkipInternalAnalytics()) return
      const sessionId = getOrCreatePageViewClientSessionId()
      const referrer = typeof document !== 'undefined' ? document.referrer || null : null
      const { getOrCreateRadarVisitorId } = await import('@/lib/radar')
      const radarVisitorId = getOrCreateRadarVisitorId()
      trackPageView(path, {
        session_id: sessionId,
        referrer,
        metadata: radarVisitorId ? { radar_visitor_id: radarVisitorId } : undefined,
      })
    })()
  }, [])

  useEffect(() => {
    if (!pathname) return
    // Avoid batching during auth flows (reduces noise if analytics API is slow/errors)
    if (pathname.startsWith('/auth')) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      if (pathname !== prevPathRef.current) {
        prevPathRef.current = pathname
        doSend(pathname)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [pathname, doSend])

  return null
}
