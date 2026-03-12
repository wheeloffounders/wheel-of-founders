'use client'

import { useEffect } from 'react'
import { forceServiceWorkerUpdate, getServiceWorkerState } from '@/lib/service-worker-utils'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const isDev = process.env.NODE_ENV === 'development'
    if (!isLocalhost && !isDev && process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[sw] Registered scope:', registration.scope)
        if (registration.installing) {
          console.log('[sw] Installing new worker')
        }
        if (registration.waiting) {
          console.log('[sw] Waiting worker (reload to activate)')
        }
        registration.addEventListener('updatefound', () => {
          console.log('[sw] Update found, new worker installing')
        })
        registration.update()
      })
      .catch((error) => {
        console.error('[sw] Registration failed:', error)
      })

    if (isDev || isLocalhost) {
      ;(window as unknown as { __forceSWUpdate?: () => Promise<void> }).__forceSWUpdate =
        forceServiceWorkerUpdate
      ;(window as unknown as { __getSWState?: () => Promise<unknown> }).__getSWState =
        getServiceWorkerState
      console.log(
        '[sw] Dev: run __forceSWUpdate() to unregister and re-register SW, __getSWState() for state'
        )
    }
  }, [])

  return null
}

