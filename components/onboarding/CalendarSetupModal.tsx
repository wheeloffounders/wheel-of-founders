'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  trackCalendarEvent,
  type CalendarPlacement,
  type CalendarUserSegment,
} from '@/lib/analytics/calendar-events'
import { CalendarMrsDeerReminderNote } from '@/components/CalendarMrsDeerReminderNote'

type Provider = 'google' | 'apple' | 'outlook'

type CalendarLinks = {
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
}

export function CalendarSetupModal({
  isOpen,
  onClose,
  onDone,
  placement = 'after-morning',
  userSegment = 'new_user',
}: Props) {
  const [morningTime, setMorningTime] = useState('09:00')
  const [eveningTime, setEveningTime] = useState('20:00')
  const [sendCalendar, setSendCalendar] = useState(true)
  const [sendWhatsApp] = useState(true)
  const [saving, setSaving] = useState(false)
  const [links, setLinks] = useState<CalendarLinks | null>(null)
  const [askSkipReason, setAskSkipReason] = useState(false)
  const [skipReason, setSkipReason] = useState<string>('')

  useEffect(() => {
    if (!isOpen) return
    void trackCalendarEvent('calendar_setup_modal_viewed', {
      placement,
      userSegment,
    })
    ;(async () => {
      try {
        const [settingsRes, subRes] = await Promise.all([
          fetch('/api/user/notification-settings', { credentials: 'include' }),
          fetch('/api/user/calendar-subscription', { credentials: 'include' }),
        ])
        const settingsJson = (await settingsRes.json().catch(() => ({}))) as {
          settings?: { morningTime?: string; eveningTime?: string }
        }
        if (settingsJson.settings?.morningTime) setMorningTime(settingsJson.settings.morningTime)
        if (settingsJson.settings?.eveningTime) setEveningTime(settingsJson.settings.eveningTime)
        const subJson = (await subRes.json().catch(() => ({}))) as { links?: CalendarLinks }
        if (subJson.links) setLinks(subJson.links)
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

  const handleSubscribe = async (provider: Provider) => {
    try {
      setSaving(true)
      await saveTimes()
      if (sendCalendar && links) {
        void trackCalendarEvent('calendar_provider_clicked', {
          placement,
          userSegment,
          provider,
        })
        window.open(links[provider], '_blank', 'noopener,noreferrer')
      }
      void trackCalendarEvent('calendar_setup_subscribed', {
        placement,
        userSegment,
        provider,
        sendCalendar,
        whatsappPlaceholder: sendWhatsApp,
      })
      onDone?.()
      onClose()
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

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3 rounded border border-gray-200 dark:border-gray-700 p-3">
            <span className="text-sm text-gray-700 dark:text-gray-200">Morning reminder</span>
            <input
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded border border-gray-200 dark:border-gray-700 p-3">
            <span className="text-sm text-gray-700 dark:text-gray-200">Evening reminder</span>
            <input
              type="time"
              value={eveningTime}
              onChange={(e) => setEveningTime(e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
            />
          </label>
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-200">
            {weeklyLabel}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={sendCalendar} onChange={(e) => setSendCalendar(e.target.checked)} />
            Send to my calendar (Google/Apple/Outlook)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <input type="checkbox" checked={sendWhatsApp} readOnly disabled />
            Send to WhatsApp (coming soon)
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={saving || !links}
            onClick={() => handleSubscribe('google')}
            className="rounded bg-[#ef725c] text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            Google
          </button>
          <button
            type="button"
            disabled={saving || !links}
            onClick={() => handleSubscribe('apple')}
            className="rounded bg-[#152b50] text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            Apple
          </button>
          <button
            type="button"
            disabled={saving || !links}
            onClick={() => handleSubscribe('outlook')}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            Outlook
          </button>
        </div>

        <CalendarMrsDeerReminderNote />

        {!askSkipReason ? (
          <button
            type="button"
            className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setAskSkipReason(true)}
          >
            Skip for now
          </button>
        ) : (
          <div className="mt-3 rounded border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
              Optional: what made you skip?
            </p>
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

