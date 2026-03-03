'use client'

import { APP_VERSION } from '@/lib/version'

/**
 * App version display for Settings page only.
 * Shows current version in a clean, inline format.
 */
export function SettingsVersion() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Current version: <span className="font-mono">{APP_VERSION}</span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
        Checked for updates automatically
      </p>
    </div>
  )
}
