'use client'

import { useEffect, useState } from 'react'
import { getUserSession } from '@/lib/auth'
import { fetchEmailPreferences, updateEmailPreferences, type EmailPreferences } from '@/lib/email/preferences'
import { PreferenceToggle } from '@/components/ui/preference-toggle'
import { CalendarMrsDeerReminderNote } from '@/components/CalendarMrsDeerReminderNote'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

export function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences | null>(null)
  const [emailPrefsMessage, setEmailPrefsMessage] = useState<string | null>(null)

  /** Email reminder wall times (email channel only) */
  const [emailMorning, setEmailMorning] = useState('09:00')
  const [emailEvening, setEmailEvening] = useState('20:00')
  /** Calendar feed wall times (subscription .ics — independent from email) */
  const [calMorning, setCalMorning] = useState('09:00')
  const [calEvening, setCalEvening] = useState('20:00')

  const [emailFrequency, setEmailFrequency] = useState<'daily' | 'weekly_only' | 'achievements_only' | 'none'>('daily')
  const [emailScheduleSaving, setEmailScheduleSaving] = useState(false)
  /** Calendar: include Monday weekly insight event in subscribed feed */
  const [calendarWeeklyInsight, setCalendarWeeklyInsight] = useState(true)
  const [showMoreEmail, setShowMoreEmail] = useState(false)

  const [calendarLinks, setCalendarLinks] = useState<{
    feedUrl: string
    google: string
    apple: string
    outlook: string
  } | null>(null)
  const [openingProvider, setOpeningProvider] = useState<'google' | 'apple' | 'outlook' | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getUserSession()
        if (!session) return

        const settingsRes = await fetch('/api/user/notification-settings', { credentials: 'include' })
        const settingsJson = (await settingsRes.json().catch(() => ({}))) as {
          settings?: {
            emailMorningReminderTime?: string
            emailEveningReminderTime?: string
            emailFrequency?: 'daily' | 'weekly_only' | 'achievements_only' | 'none'
            morningTime?: string
            eveningTime?: string
            weeklyInsights?: boolean
          }
        }
        const s = settingsJson.settings
        if (s?.emailFrequency) setEmailFrequency(s.emailFrequency)
        const em = s?.emailMorningReminderTime ?? s?.morningTime
        const ee = s?.emailEveningReminderTime ?? s?.eveningTime
        const cm = s?.morningTime ?? s?.emailMorningReminderTime
        const cv = s?.eveningTime ?? s?.emailEveningReminderTime
        if (em) setEmailMorning(em)
        if (ee) setEmailEvening(ee)
        if (cm) setCalMorning(cm)
        if (cv) setCalEvening(cv)
        if (s?.weeklyInsights !== undefined) setCalendarWeeklyInsight(s.weeklyInsights)

        const prefs = await fetchEmailPreferences()
        setEmailPrefs(prefs)

        const subRes = await fetch('/api/user/calendar-subscription', { credentials: 'include' })
        const subJson = (await subRes.json().catch(() => ({}))) as {
          links?: { feedUrl: string; google: string; apple: string; outlook: string }
        }
        if (subJson.links) setCalendarLinks(subJson.links)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const persistNotificationSettings = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/user/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailMorningReminderTime: emailMorning,
          emailEveningReminderTime: emailEvening,
          morningTime: calMorning,
          eveningTime: calEvening,
          emailFrequency,
          weeklyInsights: calendarWeeklyInsight,
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  const handleToggleEmailPref = (key: keyof EmailPreferences) => {
    setEmailPrefs((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev))
  }

  const handleSaveEmailReminders = async () => {
    if (!emailPrefs) {
      setEmailPrefsMessage('Still loading preferences — try again in a moment.')
      return
    }
    setEmailScheduleSaving(true)
    setEmailPrefsMessage(null)
    try {
      const res = await fetch('/api/user/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailMorningReminderTime: emailMorning,
          emailEveningReminderTime: emailEvening,
          morningTime: calMorning,
          eveningTime: calEvening,
          emailFrequency,
          weeklyInsights: calendarWeeklyInsight,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || 'Failed to save')
      }
      const savedJson = (await res.json().catch(() => ({}))) as {
        saved?: { morningTime?: string; eveningTime?: string }
      }
      if (savedJson.saved?.morningTime) setCalMorning(savedJson.saved.morningTime)
      if (savedJson.saved?.eveningTime) setCalEvening(savedJson.saved.eveningTime)
      await updateEmailPreferences(emailPrefs)
      setEmailPrefsMessage('Saved.')
      setTimeout(() => setEmailPrefsMessage(null), 3000)
    } catch (err) {
      setEmailPrefsMessage(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setEmailScheduleSaving(false)
    }
  }

  const openCalendarProvider = async (provider: 'google' | 'apple' | 'outlook') => {
    const url = calendarLinks?.[provider]
    if (!url) return
    setOpeningProvider(provider)
    try {
      await persistNotificationSettings()
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = url
    } finally {
      setOpeningProvider(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Email: times + digest / badges + frequency + more toggles */}
      <div className="card bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">📧 Email reminders</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose when we email you. This is separate from calendar subscriptions below.
        </p>

        {emailPrefs ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Morning reminder</span>
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    value={emailMorning}
                    onChange={(e) => setEmailMorning(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums"
                  />
                  <span className="text-lg" aria-hidden>
                    ⏰
                  </span>
                </span>
              </label>
              <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Evening reminder</span>
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    value={emailEvening}
                    onChange={(e) => setEmailEvening(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums"
                  />
                  <span className="text-lg" aria-hidden>
                    ⏰
                  </span>
                </span>
              </label>
            </div>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300"
                checked={emailPrefs.weekly_digest}
                onChange={() => handleToggleEmailPref('weekly_digest')}
              />
              <span>
                <span className="font-medium">Weekly insight</span>
                <span className="text-gray-600 dark:text-gray-400"> — send on Mondays</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300"
                checked={emailPrefs.onboarding}
                onChange={() => handleToggleEmailPref('onboarding')}
              />
              <span>
                <span className="font-medium">Badges &amp; unlocks</span>
                <span className="text-gray-600 dark:text-gray-400"> — send when earned</span>
              </span>
            </label>

            <label className="text-sm text-gray-700 dark:text-gray-300 block">
              Email frequency
              <select
                value={emailFrequency}
                onChange={(e) =>
                  setEmailFrequency(e.target.value as 'daily' | 'weekly_only' | 'achievements_only' | 'none')
                }
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 text-sm"
              >
                <option value="daily">Daily reminders</option>
                <option value="weekly_only">Weekly digest only</option>
                <option value="achievements_only">Achievements and insights only</option>
                <option value="none">None (except critical emails)</option>
              </select>
            </label>

            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-[#152b50] dark:text-gray-300"
              onClick={() => setShowMoreEmail((v) => !v)}
            >
              {showMoreEmail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              More email types
            </button>
            {showMoreEmail ? (
              <div className="space-y-2 pl-1 border-l-2 border-gray-200 dark:border-gray-600">
                <PreferenceToggle
                  label="Inactivity reminders"
                  description="Nudges when you have not checked in for a while."
                  enabled={emailPrefs.inactivity_reminders}
                  onToggle={() => handleToggleEmailPref('inactivity_reminders')}
                />
                <PreferenceToggle
                  label="Nurture emails"
                  description="Milestones at 30, 60, and 90 days."
                  enabled={emailPrefs.nurture_emails}
                  onToggle={() => handleToggleEmailPref('nurture_emails')}
                />
                <PreferenceToggle
                  label="Marketing updates"
                  description="News and feature announcements."
                  enabled={emailPrefs.marketing_updates}
                  onToggle={() => handleToggleEmailPref('marketing_updates')}
                />
              </div>
            ) : null}

            {emailPrefsMessage && (
              <div
                className={`p-3 rounded text-sm ${
                  emailPrefsMessage === 'Saved.' || emailPrefsMessage.toLowerCase().includes('saved')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {emailPrefsMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSaveEmailReminders()}
              disabled={emailScheduleSaving}
              className="inline-flex items-center px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50 text-sm font-medium"
            >
              {emailScheduleSaving ? 'Saving…' : 'Save email preferences'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </div>

      {/* Calendar: separate wall times + weekly insight in feed + provider buttons */}
      <div className="card bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">📅 Calendar reminders</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Subscribed calendars use these times only — not your email schedule above.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Loading…
          </p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Morning</span>
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    value={calMorning}
                    onChange={(e) => setCalMorning(e.target.value)}
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
                    value={calEvening}
                    onChange={(e) => setCalEvening(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums"
                  />
                  <span className="text-lg" aria-hidden>
                    ⏰
                  </span>
                </span>
              </label>
            </div>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-800 dark:text-gray-200 mb-4">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300"
                checked={calendarWeeklyInsight}
                onChange={() => setCalendarWeeklyInsight((v) => !v)}
              />
              <span>
                <span className="font-medium">Weekly insight</span>
                <span className="text-gray-600 dark:text-gray-400"> — Monday event in your subscribed calendar</span>
              </span>
            </label>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Add to your calendar:</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                type="button"
                disabled={!calendarLinks?.google || openingProvider !== null}
                onClick={() => void openCalendarProvider('google')}
                className="inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-[#ef725c] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                {openingProvider === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Google Calendar'}
              </button>
              <button
                type="button"
                disabled={!calendarLinks?.apple || openingProvider !== null}
                onClick={() => void openCalendarProvider('apple')}
                className="inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-[#152b50] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                {openingProvider === 'apple' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apple Calendar'}
              </button>
              <button
                type="button"
                disabled={!calendarLinks?.outlook || openingProvider !== null}
                onClick={() => void openCalendarProvider('outlook')}
                className="inline-flex justify-center items-center px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                {openingProvider === 'outlook' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Outlook'}
              </button>
            </div>
            <CalendarMrsDeerReminderNote />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center sm:text-left">
              One click — events will sync across all your devices
            </p>
          </>
        )}
      </div>

      <div className="card bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Push notifications coming soon</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          We&apos;re temporarily pausing in-app push notifications while we explore a native app or PWA wrapper. Your
          core daily flow, email reminders, and weekly insights will keep working as usual.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          When push is ready for production, this page will let you turn on gentle reminders for morning and evening.
        </p>
      </div>
    </div>
  )
}
