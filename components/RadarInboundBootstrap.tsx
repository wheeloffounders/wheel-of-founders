'use client'

import { useEffect } from 'react'
import { ensureInboundContextCookie } from '@/lib/radar'

/** Capture first-touch referrer + UTMs + landing path as early as possible (before any widget fires). */
export function RadarInboundBootstrap() {
  useEffect(() => {
    ensureInboundContextCookie()
  }, [])
  return null
}
