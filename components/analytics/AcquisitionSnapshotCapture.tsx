'use client'

import { useEffect } from 'react'
import { parseInboundCookieValue, WOF_INBOUND_COOKIE } from '@/lib/acquisition-snapshot'

const STORAGE_KEY = 'wof_acquisition_backfill_sent'

function readInboundCookieClient(): ReturnType<typeof parseInboundCookieValue> {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === WOF_INBOUND_COOKIE) {
      return parseInboundCookieValue(rest.join('=').trim())
    }
  }
  return null
}

/**
 * One-time backfill of acquisition_snapshot from first-touch cookie after login.
 */
export function AcquisitionSnapshotCapture() {
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY)) return

    const inbound = readInboundCookieClient()
    if (!inbound) return

    void (async () => {
      try {
        const res = await fetch('/api/user/acquisition-snapshot', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inbound }),
        })
        if (res.ok) sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* non-blocking */
      }
    })()
  }, [])

  return null
}
