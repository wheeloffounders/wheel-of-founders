'use client'

import { useMemo, useState, useEffect } from 'react'
import { Bell, Mail } from 'lucide-react'
import { getNotificationPlatform } from '@/lib/notifications/platform'

const GUIDANCE: Record<string, { title: string; steps: string[] }> = {
  mac: {
    title: 'On Mac',
    steps: [
      'System Settings → Notifications → your browser (Chrome/Brave)',
      'Turn on "Allow Notifications"',
      'If you use Focus: allow this site or turn off Focus for reminders',
    ],
  },
  windows: {
    title: 'On Windows',
    steps: [
      'Settings → System → Notifications',
      'Ensure browser notifications are on',
      'If you use Focus assist: set to "Off" or add an exception',
    ],
  },
  ios: {
    title: 'On iPhone/iPad',
    steps: [
      'Web push is limited on iOS. We’ll send reminders by email and show them in the app.',
      'Turn on "Email notifications" in settings so you don’t miss reminders.',
    ],
  },
  android: {
    title: 'On Android',
    steps: [
      'Add this site to Home screen for best results',
      'Settings → Apps → your browser → Notifications → turn on',
      'Allow notifications when the browser prompts',
    ],
  },
  linux: {
    title: 'On Linux',
    steps: [
      'Allow notifications when the browser asks',
      'Ensure your desktop (GNOME, KDE, etc.) has notifications enabled for the browser',
      'You can also get reminders by email if push is blocked',
    ],
  },
  other: {
    title: 'Tips',
    steps: [
      'Allow notifications when the browser asks',
      'Check system/browser "Do Not Disturb" or "Focus" and allow this site',
      'You can also get reminders by email if push is blocked',
    ],
  },
}

interface NotificationGuidanceProps {
  className?: string
  variant?: 'compact' | 'full'
}

export function NotificationGuidance({ className = '', variant = 'full' }: NotificationGuidanceProps) {
  const [mounted, setMounted] = useState(false)
  const platform = useMemo(() => (mounted ? getNotificationPlatform() : 'other'), [mounted])
  const { title, steps } = GUIDANCE[platform] ?? GUIDANCE.other

  useEffect(() => {
    setMounted(true)
  }, [])

  if (variant === 'compact') {
    return (
      <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
        {platform === 'ios'
          ? 'On iPhone we use email and in-app reminders.'
          : 'Allow notifications in your browser and check system Do Not Disturb/Focus settings.'}
      </p>
    )
  }

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 ${className}`}>
      <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium mb-2">
        <Bell className="w-4 h-4 text-[#ef725c]" />
        {title}
      </div>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
      {platform !== 'ios' && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
          <Mail className="w-3 h-3" />
          You can also enable email reminders in Settings if push is blocked.
        </p>
      )}
    </div>
  )
}
