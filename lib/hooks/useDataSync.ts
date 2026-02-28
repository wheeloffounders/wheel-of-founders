'use client'

import { useState, useCallback } from 'react'

export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const syncData = useCallback(async (showToast = true) => {
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
      
      if (showToast) {
        // Dispatch toast event (components can listen for this)
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Data synced successfully', type: 'success' },
          })
        )
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
