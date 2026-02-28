'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

type NotificationSettingsState = {
  morning_enabled: boolean
  morning_time: string // HH:MM
  evening_enabled: boolean
  evening_time: string // HH:MM
}

type MessageState = { type: 'success' | 'error'; text: string } | null

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettingsState>({
    morning_enabled: true,
    morning_time: '08:00',
    evening_enabled: true,
    evening_time: '20:00',
  })
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)

  useEffect(() => {
    const init = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }

      await loadSettings(session.user.id)
      checkPushSupport()
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('morning_enabled, morning_time, evening_enabled, evening_time')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        // Non-fatal: table/row may not exist yet
        console.warn('Error loading notification settings:', (error as any)?.message || error)
        return
      }

      if (data) {
        setSettings({
          morning_enabled: data.morning_enabled ?? true,
          morning_time: (data.morning_time as string | null)?.slice(0, 5) || '08:00',
          evening_enabled: data.evening_enabled ?? true,
          evening_time: (data.evening_time as string | null)?.slice(0, 5) || '20:00',
        })
      }
    } catch (error) {
      console.error('Unexpected error loading notification settings:', error)
      setMessage({ type: 'error', text: 'Failed to load notification settings' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('user_notification_settings')
        .upsert(
          {
            user_id: session.user.id,
            morning_enabled: settings.morning_enabled,
            morning_time: `${settings.morning_time}:00`,
            evening_enabled: settings.evening_enabled,
            evening_time: `${settings.evening_time}:00`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) throw error

      setMessage({ type: 'success', text: 'Notification settings saved' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving notification settings:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save notification settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const checkPushSupport = () => {
    if (typeof window === 'undefined') return

    const hasSupport =
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setPushSupported(hasSupport)

    if (hasSupport) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }

  const requestPushPermission = async () => {
    try {
      if (!('Notification' in window)) return

      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        await registerPushSubscription()
        setMessage({ type: 'success', text: 'Browser notifications enabled' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Notification permission denied' })
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      setMessage({ type: 'error', text: 'Failed to enable browser notifications' })
    }
  }

  const registerPushSubscription = async () => {
    // Placeholder for future web push implementation.
    // This will eventually:
    // - Register a service worker
    // - Create a PushManager subscription
    // - Store the subscription in user_notification_settings.push_subscription
    console.info('Web push registration is not implemented yet.')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef725c]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-5 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-[#ef725c]" />
          Notification Settings
        </h1>
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mt-2">
          Set your preferred times for gentle morning and evening reminders.
        </p>
      </div>

      {/* Morning Reminder */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Morning Reminder</h2>
        </div>

        <p className="mb-4 text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
          ℹ️ Notifications are checked once daily. You may receive reminders for the previous day&apos;s
          planned times rather than the exact minute you chose.
        </p>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.morning_enabled}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, morning_enabled: e.target.checked }))
              }
              className="w-5 h-5 text-[#ef725c] rounded focus:ring-[#ef725c]"
            />
            <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">Enable morning reminder</span>
          </label>

          {settings.morning_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Reminder time (your local time)
              </label>
              <input
                type="time"
                value={settings.morning_time}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, morning_time: e.target.value }))
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
                We&apos;ll nudge you to set your morning focus and plan your day.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Evening Reminder */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Evening Reminder</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.evening_enabled}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, evening_enabled: e.target.checked }))
              }
              className="w-5 h-5 text-[#ef725c] rounded focus:ring-[#ef725c]"
            />
            <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">Enable evening reminder</span>
          </label>

          {settings.evening_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Reminder time (your local time)
              </label>
              <input
                type="time"
                value={settings.evening_time}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, evening_time: e.target.value }))
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
                We&apos;ll remind you to close the loop on your day with an evening reflection.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Browser Notifications */}
      {pushSupported && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-2">Browser Notifications</h2>
          <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-4">
            Enable browser notifications so Wheel of Founders can gently tap you on the shoulder,
            even when the app is closed.
          </p>

          {pushEnabled ? (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 p-4 rounded-lg text-sm">
              ✅ Notifications are enabled in your browser.
            </div>
          ) : (
            <button
              type="button"
              onClick={requestPushPermission}
              className="px-6 py-2 bg-[#152b50] text-white rounded-lg text-sm font-medium hover:bg-[#1a3565] transition"
            >
              Enable Browser Notifications
            </button>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="px-8 py-3 bg-[#ef725c] text-white font-semibold rounded-lg hover:bg-[#f28771] transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

