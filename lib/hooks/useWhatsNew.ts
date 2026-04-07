'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { WhatsNewItem, WhatsNewResponse } from '@/lib/types/founder-dna'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'

export function useWhatsNew() {
  const pathname = usePathname()
  const [hasNew, setHasNew] = useState(false)
  const [items, setItems] = useState<WhatsNewItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const headers = await getClientAuthHeaders()
      const res = await fetch('/api/founder-dna/whats-new', {
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        setHasNew(false)
        setItems([])
        return
      }
      const json = (await res.json()) as WhatsNewResponse
      setHasNew(Boolean(json.hasNew))
      setItems(Array.isArray(json.items) ? json.items : [])
    } catch {
      setHasNew(false)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      await load()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [load])

  useEffect(() => {
    if (pathname?.startsWith('/founder-dna')) {
      load()
    }
  }, [pathname, load])

  useEffect(() => {
    const onSync = () => load()
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [load])

  const markAsViewed = useCallback(async () => {
    try {
      const headers = await getClientAuthHeaders()
      await fetch('/api/founder-dna/mark-viewed', {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      setHasNew(false)
      setItems([])
      window.dispatchEvent(new CustomEvent('founder-dna-viewed'))
      window.dispatchEvent(new CustomEvent('data-sync-request'))
    } catch {
      // non-critical
    }
  }, [])

  return { hasNew, items, loading, markAsViewed, refresh: load }
}
