'use client'

/**
 * ForceUpdateChecker - Detects new app versions and forces reload automatically.
 * Checks immediately on load and every 30 seconds. No user action required.
 */
import { useEffect } from 'react'
import { performForceReload, VERSION_STORAGE_KEY } from '@/lib/version'
import { isDevelopment } from '@/lib/env'

export function ForceUpdateChecker({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (isDevelopment) return

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', {
          cache: 'no-store',
          headers: { Pragma: 'no-cache' },
        })
        const data = await res.json()
        const serverVersion = data.version

        const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)

        console.log('🔄 VERSION CHECK - Server:', serverVersion, 'Local:', storedVersion)

        // First visit - store version
        if (!storedVersion) {
          localStorage.setItem(VERSION_STORAGE_KEY, serverVersion)
          return
        }

        // New version detected - FORCE UPDATE
        if (storedVersion !== serverVersion) {
          console.log('🔄 NEW VERSION DETECTED! Forcing update...')
          localStorage.setItem(VERSION_STORAGE_KEY, serverVersion)
          performForceReload()
        }
      } catch (error) {
        console.error('Version check failed:', error)
      }
    }

    // Run immediately
    checkVersion()

    // Run every 30 seconds to catch updates while app is open
    const interval = setInterval(checkVersion, 30000)

    return () => clearInterval(interval)
  }, [])

  return <>{children}</>
}
