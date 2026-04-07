'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  trackCalendarEvent,
  type CalendarPlacement,
  type CalendarUserSegment,
} from '@/lib/analytics/calendar-events'
import { CalendarMrsDeerReminderNote } from '@/components/CalendarMrsDeerReminderNote'
import { startGoogleCalendarOAuth } from '@/lib/google-calendar-oauth'
import {
  buildCalendarPersonalSuccessLine,
  hourFromTimeString,
  mrsDeerLineForEveningHour,
  mrsDeerLineForMorningHour,
} from '@/lib/calendar-reminder-feedback'
import { Loader2 } from 'lucide-react'

type Provider = 'google' | 'apple'

type CalendarLinks = {
  feedUrl: string
  webcalUrl?: string
  google: string
  apple: string
  outlook: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onDone?: () => void
  placement?: CalendarPlacement
  userSegment?: CalendarUserSegment
  /** Task or decision snippet for personalized success copy */
  personalizationHint?: string | null
}

const CORAL = '#ef725c'
const GOOGLE_SUCCESS_READ_MS = 1100

export function CalendarSetupModal({
  isOpen,
  onClose,
  onDone,
  placement = 'after-morning',
  userSegment = 'new_user',
  personalizationHint = null,
}: Props) {
  const [morningTime, setMorningTime] = useState('09:00')
  const [eveningTime, setEveningTime] = useState('20:00')
  const [sendCalendar, setSendCalendar] = useState(true)
  const [sendWhatsApp] = useState(true)
  const [saving, setSaving] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [links, setLinks] = useState<CalendarLinks | null>(null)
  const [askSkipReason, setAskSkipReason] = useState(false)
  const [skipReason, setSkipReason] = useState<string>('')
  const [syncSuccess, setSyncSuccess] = useState<'google' | 'apple' | null>(null)

  const morningNote = useMemo(() => mrsDeerLineForMorningHour(hourFromTimeString(morningTime)), [morningTime])
  const eveningNote = useMemo(() => mrsDeerLineForEveningHour(hourFromTimeString(eveningTime)), [eveningTime])
  const successPersonalLine = useMemo(
    () => buildCalendarPersonalSuccessLine(personalizationHint),
    [personalizationHint],
  )

  useEffect(() => {
    if (!isOpen) return
    void trackCalendarEvent('calendar_setup_modal_viewed', {
      placement,
      userSegment,
    })
    ;(async () => {
      try {
        const [settingsRes, subRes, googleRes] = await Promise.all([
          fetch('/api/user/notification-settings', { credentials: 'include' }),
          fetch('/api/user/calendar-subscription', { credentials: 'include' }),
          fetch('/api/user/google-calendar', { credentials: 'include' }),
        ])
        const settingsJson = (await settingsRes.json().catch(() => ({}))) as {
          settings?: { morningTime?: string; eveningTime?: string }
        }
        if (settingsJson.settings?.morningTime) setMorningTime(settingsJson.settings.morningTime)
        if (settingsJson.settings?.eveningTime) setEveningTime(settingsJson.settings.eveningTime)
        const subJson = (await subRes.json().catch(() => ({}))) as { links?: CalendarLinks }
        if (subJson.links) setLinks(subJson.links)
        const googleJson = (await googleRes.json().catch(() => ({}))) as { connected?: boolean }
        setGoogleConnected(Boolean(googleJson.connected))
      } catch {
        // ignore
      }
    })()
  }, [isOpen, placement, userSegment])

  const weeklyLabel = useMemo(() => 'Weekly insight (Mon 09:00)', [])

  if (!isOpen) return null

  const saveTimes = async () => {
    await fetch('/api/user/notification-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        morning: true,
        morningTime,
        evening: true,
        eveningTime,
        weeklyInsights: true,
        emailMorningReminderTime: morningTime,
        emailEveningReminderTime: eveningTime,
      }),
    })
  }

  const finishSubscribed = (provider: Provider) => {
    void trackCalendarEvent('calendar_setup_subscribed', {
      placement,
      userSegment,
      provider,
      sendCalendar,
      whatsappPlaceholder: sendWhatsApp,
    })
    onDone?.()
    onClose()
  }

  const handleSubscribe = async (provider: Provider) => {
    try {
      setSaving(true)
      setSyncSuccess(null)
      await saveTimes()
      if (!sendCalendar || !links) {
        finishSubscribed(provider)
        return
      }

      void trackCalendarEvent('calendar_provider_clicked', {
        placement,
        userSegment,
        provider,
      })
      void fetch('/api/analytics/calendar-subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: provider }),
      }).catch(() => {})

      if (provider === 'google') {
        setGoogleBusy(true)
        try {
          setSyncSuccess('google')
          await new Promise((r) => setTimeout(r, GOOGLE_SUCCESS_READ_MS))
          await startGoogleCalendarOAuth('/dashboard')
        } finally {
          setGoogleBusy(false)
        }
        return
      }

      const raw = links.apple
      window.open(raw, '_blank', 'noopener,noreferrer')
      setSyncSuccess('apple')
      await new Promise((r) => setTimeout(r, 2800))
      setSyncSuccess(null)
      finishSubscribed('apple')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    void trackCalendarEvent('calendar_setup_skipped', {
      placement,
      userSegment,
      skipReason: skipReason || undefined,
    })
    onDone?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleSkip}>
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Set up reminders in one tap</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Stay in your rhythm with automatic calendar reminders for morning, evening, and weekly insights.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="flex items-center justify-between gap-3 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="text-sm text-gray-700 dark:text-gray-200">Morning reminder</span>
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
              />
            </label>
            <p className="mt-1.5 px-1 text-xs italic text-gray-600 dark:text-gray-400">{morningNote}</p>
          </div>
          <div>
            <label className="flex items-center justify-between gap-3 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="text-sm text-gray-700 dark:text-gray-200">Evening reminder</span>
              <input
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
              />
            </label>
            <p className="mt-1.5 px-1 text-xs italic text-gray-600 dark:text-gray-400">{eveningNote}</p>
          </div>
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-200">
            {weeklyLabel}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={sendCalendar} onChange={(e) => setSendCalendar(e.target.checked)} />
            Send to my calendar (Google or Apple)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <input type="checkbox" checked={sendWhatsApp} readOnly disabled />
            Send to WhatsApp (coming soon)
          </label>
        </div>

        <p className="text-center text-sm italic mt-5 mb-3 leading-relaxed text-[#152b50]/70 dark:text-gray-400 px-1">
          85% of our most consistent Founders use calendar nudges to stay on track.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving || googleBusy || syncSuccess !== null || googleConnected || !sendCalendar}
            onClick={() => void handleSubscribe('google')}
            className="rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ backgroundColor: CORAL }}
          >
            {googleBusy ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
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
            disabled={saving || !links || syncSuccess !== null || !sendCalendar}
            onClick={() => void handleSubscribe('apple')}
            className="rounded-lg border-2 border-[#152b50] bg-transparent px-4 py-3 text-sm font-semibold text-[#152b50] transition hover:-translate-y-0.5 hover:bg-black/[0.02] dark:border-white/70 dark:text-white dark:hover:bg-white/[0.04] disabled:opacity-50"
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

        <CalendarMrsDeerReminderNote />

        {!askSkipReason ? (
          <button
            type="button"
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setAskSkipReason(true)}
          >
            Skip for now
          </button>
        ) : (
          <div className="mt-4 rounded border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Optional: what made you skip?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Not now', 'Already use reminders', 'Too many notifications', 'Other'].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSkipReason(reason)}
                  className={`text-xs rounded px-2 py-1 border ${
                    skipReason === reason
                      ? 'border-[#ef725c] text-[#ef725c]'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleSkip}
            >
              Continue without calendar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
