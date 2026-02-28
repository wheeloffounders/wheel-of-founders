'use client'

/**
 * VersionChecker - Passive version display only.
 * Shows a small "v{version}" in the bottom-right. Does not block or prompt.
 * ForceUpdateChecker handles the blocking update flow.
 */
import { APP_VERSION } from '@/lib/version'
import { isDevelopment } from '@/lib/env'

export function VersionChecker() {
  if (isDevelopment) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 text-xs text-gray-400 dark:text-gray-500">
      v{APP_VERSION}
    </div>
  )
}
