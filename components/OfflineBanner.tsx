'use client'

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, Check } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced'

export function OfflineBanner() {
  const [status, setStatus] = useState<SyncStatus>('online')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setStatus('syncing')
      // Trigger data sync - dashboard and other components listen for this
      window.dispatchEvent(new CustomEvent('data-sync-request'))
      setLastSynced(new Date())
      setStatus('synced')
      setTimeout(() => setStatus('online'), 3000)
    }

    const handleOffline = () => setStatus('offline')

    setStatus(navigator.onLine ? 'online' : 'offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (status === 'online') return null

  if (status === 'offline') {
    return (
      <div
        className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
        style={{ backgroundColor: colors.amber.soft, color: colors.navy.DEFAULT, borderBottom: `1px solid ${colors.amber.DEFAULT}` }}
      >
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        You&apos;re offline. Some features may be limited.
      </div>
    )
  }

  if (status === 'syncing') {
    return (
      <div
        className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
        style={{ backgroundColor: colors.emerald.soft, color: colors.navy.DEFAULT, borderBottom: `1px solid ${colors.emerald.DEFAULT}` }}
      >
        <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
        Syncing...
      </div>
    )
  }

  if (status === 'synced') {
    return (
      <div
        className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
        style={{ backgroundColor: colors.emerald.soft, color: colors.navy.DEFAULT, borderBottom: `1px solid ${colors.emerald.DEFAULT}` }}
      >
        <Check className="w-4 h-4 flex-shrink-0" />
        ✓ Updated just now
      </div>
    )
  }

  return null
}
