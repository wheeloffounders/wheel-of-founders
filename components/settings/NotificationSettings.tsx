'use client'

// Temporary stub: push notifications are disabled.
// This component intentionally only shows an informational message.

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="card bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Push notifications coming soon
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          We&apos;re temporarily pausing in-app push notifications while we explore a native app or PWA wrapper.
          Your core daily flow, email reminders, and weekly insights will keep working as usual.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          When push is ready for production, this page will let you turn on gentle reminders for morning and evening.
        </p>
      </div>
    </div>
  )
}

