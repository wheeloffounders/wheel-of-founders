'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarMrsDeerReminderNote } from '@/components/CalendarMrsDeerReminderNote'
import { startGoogleCalendarOAuth } from '@/lib/google-calendar-oauth'
import {
  buildCalendarPersonalSuccessLine,
  hourFromTimeString,
  mrsDeerLineForEveningHour,
  mrsDeerLineForMorningHour,
} from '@/lib/calendar-reminder-feedback'
import { Loader2 } from 'lucide-react'

export type ReminderSetupScreenProps = {
  isOpen: boolean
  /** After choosing a calendar provider (save + open subscribe) or Skip for now */
  onComplete: () => void
  /** First task or decision text for personalized success copy */
  personalizationHint?: string | null
}

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

const CORAL = '#ef725c'
const GOOGLE_SUCCESS_READ_MS = 1100

export function ReminderSetupScreen({
  isOpen,
  onComplete,
  personalizationHint = null,
}: ReminderSetupScreenProps) {
  const [morningTime, setMorningTime] = useState('09:00')
  const [eveningTime, setEveningTime] = useState('20:00')
  const [busy, setBusy] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleBusyDisconnect, setGoogleBusyDisconnect] = useState(false)
  const [disconnectNote, setDisconnectNote] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<'google' | 'apple' | null>(null)

  const morningNote = useMemo(() => mrsDeerLineForMorningHour(hourFromTimeString(morningTime)), [morningTime])
  const eveningNote = useMemo(() => mrsDeerLineForEveningHour(hourFromTimeString(eveningTime)), [eveningTime])
  const successPersonalLine = useMemo(
    () => buildCalendarPersonalSuccessLine(personalizationHint),
    [personalizationHint],
  )

  useEffect(() => {
    if (!isOpen) return
    void (async () => {
      try {
        const res = await fetch('/api/user/google-calendar', { credentials: 'include' })
        const json = (await res.json().catch(() => ({}))) as { connected?: boolean }
        setGoogleConnected(Boolean(json.connected))
      } catch {
        // ignore
      }
    })()
  }, [isOpen])

  if (!isOpen) return null

  const handleDisconnectGoogle = async () => {
    setGoogleBusyDisconnect(true)
    try {
      const res = await fetch('/api/user/google-calendar', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setGoogleConnected(false)
        setDisconnectNote('Disconnected from Google Calendar.')
      } else {
        setDisconnectNote('Could not disconnect Google Calendar right now.')
      }
    } finally {
      setGoogleBusyDisconnect(false)
    }
  }

  const handleGoogleSync = () => {
    void (async () => {
      setGoogleBusy(true)
      setSyncSuccess(null)
      try {
        await syncBrowserTimezone()
        await saveNotificationSettings(morningTime, eveningTime)
        void fetch('/api/analytics/calendar-subscribe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'google' }),
        }).catch(() => {})
        setSyncSuccess('google')
        await new Promise((r) => setTimeout(r, GOOGLE_SUCCESS_READ_MS))
        await startGoogleCalendarOAuth('/settings?tab=notifications')
      } catch {
        setSyncSuccess(null)
      } finally {
        setGoogleBusy(false)
      }
    })()
  }

  const handleAppleSync = () => {
    void (async () => {
      setBusy(true)
      setSyncSuccess(null)
      try {
        await syncBrowserTimezone()
        await saveNotificationSettings(morningTime, eveningTime)
        const res = await fetch('/api/user/calendar-subscription', { credentials: 'include' })
        const data = (await res.json()) as { links?: { apple?: string } }
        const openUrl = data.links?.apple
        if (openUrl) {
          void fetch('/api/analytics/calendar-subscribe', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'apple' }),
          }).catch(() => {})
          window.open(openUrl, '_blank', 'noopener,noreferrer')
          setSyncSuccess('apple')
          await new Promise((r) => setTimeout(r, 2800))
          setSyncSuccess(null)
          onComplete()
        } else {
          onComplete()
        }
      } finally {
        setBusy(false)
      }
    })()
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📅 Calendar reminders</h2>

        <div className="mt-5 space-y-4">
          <div>
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
            <p className="mt-1.5 text-xs italic text-gray-600 dark:text-gray-400 leading-relaxed pl-0 sm:pl-0">
              {morningNote}
            </p>
          </div>
          <div>
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
            <p className="mt-1.5 text-xs italic text-gray-600 dark:text-gray-400 leading-relaxed">{eveningNote}</p>
          </div>
        </div>

        <p className="text-center text-sm italic mt-6 mb-3 leading-relaxed px-1 text-[#152b50]/70 dark:text-gray-400">
          85% of our most consistent Founders use calendar nudges to stay on track.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={
              busy || googleBusy || googleBusyDisconnect || syncSuccess !== null || googleConnected
            }
            onClick={handleGoogleSync}
            className="rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:hover:translate-y-0"
            style={{ backgroundColor: CORAL }}
          >
            {googleBusy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Connecting…
              </span>
            ) : googleConnected ? (
              'Connected!'
            ) : (
              'Sync with Google'
            )}
          </button>
          <button
            type="button"
            disabled={busy || googleBusy || googleBusyDisconnect || syncSuccess !== null}
            onClick={handleAppleSync}
            className="rounded-lg border-2 border-[#152b50] bg-transparent px-4 py-3 text-sm font-semibold text-[#152b50] transition hover:-translate-y-0.5 hover:bg-black/[0.02] dark:border-white/70 dark:text-white dark:hover:bg-white/[0.04] disabled:opacity-60"
          >
            Add to Apple Calendar
          </button>
        </div>

        {syncSuccess ? (
          <div
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/95 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/40"
            role="status"
            aria-live="polite"
          >
            <p className="text-base font-semibold text-emerald-800 dark:text-emerald-200">✅ Connected!</p>
            <p className="text-sm text-gray-700 dark:text-gray-200 mt-2 leading-relaxed">{successPersonalLine}</p>
          </div>
        ) : null}

        {googleConnected ? (
          <button
            type="button"
            className="mt-3 w-full text-xs text-gray-600 dark:text-gray-300 underline"
            onClick={() => void handleDisconnectGoogle()}
            disabled={googleBusyDisconnect || busy || googleBusy}
          >
            {googleBusyDisconnect ? 'Disconnecting…' : 'Disconnect Google Calendar'}
          </button>
        ) : null}
        {disconnectNote ? (
          <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">{disconnectNote}</p>
        ) : null}

        <CalendarMrsDeerReminderNote />

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          One click — events will sync across all your devices
        </p>

        <div className="mt-6 rounded-lg border border-gray-200/90 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={handleSkip}
            disabled={busy || googleBusy || syncSuccess !== null}
            className="w-full text-xs font-medium text-gray-500 transition hover:text-gray-700 disabled:opacity-60 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Skip for now
          </button>
          <p className="mt-2 text-center text-[10px] leading-snug text-gray-400 dark:text-gray-500">
            85% of our most consistent founders keep calendar nudges on — skipping makes it easier to lose momentum by
            midweek.
          </p>
        </div>
      </div>
    </div>
  )
}
