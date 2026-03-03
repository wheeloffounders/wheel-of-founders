'use client'

import { useState, useCallback, useRef } from 'react'

const MIN_SYNC_INTERVAL_MS = 5000
const TOAST_COOLDOWN_MS = 30000

export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const lastSyncTimeRef = useRef<number>(0)
  const lastToastTimeRef = useRef<number>(0)

  const syncData = useCallback(async (showToast = true) => {
    const now = Date.now()

    // Rate limit: skip if we synced recently (unless showToast is explicitly false = background sync)
    if (showToast && now - lastSyncTimeRef.current < MIN_SYNC_INTERVAL_MS) {
      return
    }
    lastSyncTimeRef.current = now

    setIsSyncing(true)
    try {
      // Clear any stale PWA caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames
            .filter((name) => name.includes('api') || name.includes('data') || name.includes('wheel-of-founders'))
            .map((name) => caches.delete(name))
        )
      }

      // Trigger a custom event that components can listen to for refetching
      window.dispatchEvent(new CustomEvent('data-sync-request'))

      setLastSynced(new Date())

      // Only show success toast if manual sync AND enough time since last toast
      if (showToast) {
        const timeSinceLastToast = now - lastToastTimeRef.current
        if (timeSinceLastToast >= TOAST_COOLDOWN_MS) {
          lastToastTimeRef.current = now
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { message: 'Data synced successfully', type: 'success' },
            })
          )
        }
      }
    } catch (error) {
      console.error('Sync failed:', error)
      if (showToast) {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Sync failed. Pull down again to retry.', type: 'error' },
          })
        )
      }
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { syncData, isSyncing, lastSynced }
}
