'use client'

import { useEffect, useState } from 'react'

/**
 * Fetches primary founder archetype name for client DNA surfaces.
 * On 403 or missing data, returns null (feature locked or unavailable).
 */
export function usePrimaryArchetypeName(): string | null {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/founder-dna/archetype', { credentials: 'include' })
        if (res.status === 403) {
          if (!cancelled) setName(null)
          return
        }
        if (!res.ok) {
          if (!cancelled) setName(null)
          return
        }
        const json = (await res.json()) as { primary?: { name?: string } }
        const primaryName = json?.primary?.name
        if (!cancelled) {
          setName(typeof primaryName === 'string' ? primaryName : null)
        }
      } catch {
        if (!cancelled) setName(null)
      }
    }

    void load()
    const onArchetype = () => void load()
    const onSync = () => void load()
    if (typeof window !== 'undefined') {
      window.addEventListener('archetype-updated', onArchetype)
      window.addEventListener('data-sync-request', onSync)
    }
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') {
        window.removeEventListener('archetype-updated', onArchetype)
        window.removeEventListener('data-sync-request', onSync)
      }
    }
  }, [])

  return name
}
