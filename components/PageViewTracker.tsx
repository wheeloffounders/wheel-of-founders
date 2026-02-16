'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEBOUNCE_MS = 400
const RETRY_DELAY_MS = 2000
const MAX_RETRIES = 2

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('wof_pageview_session')
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem('wof_pageview_session', id)
  }
  return id
}

async function sendPageView(
  path: string,
  userId: string | null,
  sessionId: string,
  referrer: string | null
): Promise<boolean> {
  try {
    const res = await fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        referrer: referrer ?? undefined,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Tracks page views on route change and sends to /api/analytics/page-view.
 * Debounces to avoid duplicates; retries on failure; skips when offline.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const prevPathRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)

  const doSend = useCallback(async (path: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const sessionId = getOrCreateSessionId()
    const referrer = typeof document !== 'undefined' ? document.referrer || null : null

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null

    const ok = await sendPageView(path, userId, sessionId, referrer)

    if (!ok && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++
      setTimeout(() => {
        sendPageView(path, userId, sessionId, referrer)
        retryCountRef.current = 0
      }, RETRY_DELAY_MS)
    } else {
      retryCountRef.current = 0
    }
  }, [])

  useEffect(() => {
    if (!pathname) return

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
