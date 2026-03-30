'use client'

import { useState } from 'react'
import { CalendarMrsDeerReminderNote } from '@/components/CalendarMrsDeerReminderNote'

export type ReminderSetupScreenProps = {
  isOpen: boolean
  /** After choosing a calendar provider (save + open subscribe) or Skip for now */
  onComplete: () => void
}

type ProviderKey = 'google' | 'apple' | 'outlook'

async function syncBrowserTimezone(): Promise<void> {
  if (typeof Intl === 'undefined') return
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (!timezone) return
  try {
    await fetch('/api/user-preferences/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ timezone }),
    })
  } catch {
    // non-blocking
  }
}

async function saveNotificationSettings(morningTime: string, eveningTime: string): Promise<boolean> {
  try {
    const res = await fetch('/api/user/notification-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        emailMorningReminderTime: morningTime,
        emailEveningReminderTime: eveningTime,
        morningTime,
        eveningTime,
        morning: true,
        evening: true,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function ReminderSetupScreen({ isOpen, onComplete }: ReminderSetupScreenProps) {
  const [morningTime, setMorningTime] = useState('09:00')
  const [eveningTime, setEveningTime] = useState('20:00')
  const [busy, setBusy] = useState(false)

  if (!isOpen) return null

  const handleProviderClick = (provider: ProviderKey) => {
    const w = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null

    void (async () => {
      setBusy(true)
      try {
        await syncBrowserTimezone()
        await saveNotificationSettings(morningTime, eveningTime)

        const res = await fetch('/api/user/calendar-subscription', { credentials: 'include' })
        const data = (await res.json()) as {
          links?: { google?: string; apple?: string; outlook?: string }
        }
        const url = data.links?.[provider]
        if (url) {
          if (w && !w.closed) {
            w.location.href = url
          } else {
            window.open(url, '_blank', 'noopener,noreferrer')
          }
        } else if (w && !w.closed) {
          w.close()
        }
      } finally {
        setBusy(false)
        onComplete()
      }
    })()
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📅 Calendar reminders</h2>

        <div className="mt-5 space-y-3">
          <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Morning</span>
            <span className="flex items-center gap-2">
              <input
                type="time"
                value={morningTime}
                onChange={(ev) => setMorningTime(ev.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums"
              />
              <span className="text-lg" aria-hidden>
                ⏰
              </span>
            </span>
          </label>
          <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Evening</span>
            <span className="flex items-center gap-2">
              <input
                type="time"
                value={eveningTime}
                onChange={(ev) => setEveningTime(ev.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums"
              />
              <span className="text-lg" aria-hidden>
                ⏰
              </span>
            </span>
          </label>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mt-5 mb-2">Add to your calendar:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleProviderClick('google')}
            className="rounded-lg border-2 border-[#ef725c] bg-[#ef725c]/5 dark:bg-[#ef725c]/10 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:opacity-90 disabled:opacity-60"
          >
            Google Calendar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleProviderClick('apple')}
            className="rounded-lg border-2 border-[#ef725c] bg-[#ef725c]/5 dark:bg-[#ef725c]/10 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:opacity-90 disabled:opacity-60"
          >
            Apple Calendar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleProviderClick('outlook')}
            className="rounded-lg border-2 border-[#ef725c] bg-[#ef725c]/5 dark:bg-[#ef725c]/10 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:opacity-90 disabled:opacity-60"
          >
            Outlook
          </button>
        </div>

        <CalendarMrsDeerReminderNote />

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          One click — events will sync across all your devices
        </p>

        <button
          type="button"
          onClick={handleSkip}
          disabled={busy}
          className="mt-5 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-60"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
