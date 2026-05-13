'use client'

import { useEffect, useRef } from 'react'
import { getUserSession } from '@/lib/auth'

/** Runs legacy beta → 7-day trial migration after password / magic-link sessions (OAuth uses `/auth/callback`). */
export function BetaRetirementBootstrap() {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    void (async () => {
      try {
        const sess = await getUserSession()
        if (!sess?.user?.id) return
        await fetch('/api/user/apply-beta-retirement', { method: 'POST', credentials: 'include' })
      } catch {
        /* non-blocking */
      }
    })()
  }, [])
  return null
}
