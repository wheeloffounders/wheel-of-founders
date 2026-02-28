'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

/**
 * Gentle onboarding prompt to encourage founders to enable reminders.
 * Drop this into flows like /morning or /evening where it makes sense.
 */
export function NotificationPrompt() {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasSupport =
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(hasSupport)
  }, [])

  if (!supported) return null

  return (
    <div className="mt-6 rounded-xl border border-dashed border-[#ef725c]/40 bg-[#fff7f5] p-4">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-[#ef725c] mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Want a gentle nudge each morning and evening?
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            Turn on reminders so Mrs. Deer, your AI companion can tap you on the shoulder when it&apos;s time to plan and
            reflect.
          </p>
          <Link
            href="/settings/notifications"
            className="mt-3 inline-flex items-center text-sm font-medium text-[#ef725c] hover:underline"
          >
            Set up notifications
          </Link>
        </div>
      </div>
    </div>
  )
}

