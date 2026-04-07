'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { sessionSourceFromUtm } from '@/lib/analytics/session-source-map'
import { getUserSession } from '@/lib/auth'

const STORAGE_KEY = 'wof_session_source_sent'

/**
 * Records one session attribution per browser tab session when `utm_source` is calendar|email|push|direct.
 */
export function SessionSourceCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utm = searchParams?.get('utm_source')
    const mapped = sessionSourceFromUtm(utm)
    if (!mapped) return
    if (typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY)) return

    void (async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const res = await fetch('/api/analytics/session-source', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: mapped,
            landingPath:
              typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`.slice(0, 2048)
                : undefined,
          }),
        })
        if (res.ok) sessionStorage.setItem(STORAGE_KEY, mapped)
      } catch {
        // non-blocking
      }
    })()
  }, [searchParams])

  return null
}
