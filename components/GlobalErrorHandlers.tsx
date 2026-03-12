'use client'

import { useEffect } from 'react'
import { trackErrorSync } from '@/lib/error-tracker'

/**
 * Registers global error handlers for uncaught errors and unhandled rejections.
 * Mount once in root layout.
 */
export function GlobalErrorHandlers() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      trackErrorSync(event.error ?? new Error(event.message), {
        component: 'window.onerror',
        action: 'uncaught',
        severity: 'high',
        metadata: { filename: event.filename, lineno: event.lineno },
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason))
      trackErrorSync(error, {
        component: 'window.onunhandledrejection',
        action: 'unhandled',
        severity: 'high',
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])
  return null
}
