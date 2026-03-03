'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { NotificationRequest } from '@/components/NotificationRequest'

const MORNING_TIME = '9:00 AM'
const EVENING_TIME = '6:00 PM'

type NotificationSettingsState = {
  morning_enabled: boolean
  evening_enabled: boolean
}

type MessageState = { type: 'success' | 'error'; text: string } | null

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettingsState>({
    morning_enabled: true,
    evening_enabled: true,
  })
  const [message, setMessage] = useState<MessageState>(null)

  useEffect(() => {
    const init = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }

      await loadSettings(session.user.id)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('morning_enabled, evening_enabled')
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
          evening_enabled: data.evening_enabled ?? true,
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
            evening_enabled: settings.evening_enabled,
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
          Enable morning and evening reminders at fixed times daily.
        </p>
      </div>

      {/* Morning Reminder */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Morning Reminder</h2>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          You&apos;ll receive push notifications on your device, even when the app is closed.
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Morning reminders: {MORNING_TIME} daily
            </p>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Evening reminders: {EVENING_TIME} daily
            </p>
          )}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-2">Push Notifications</h2>
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-4">
          Get notifications on your phone even when the app is closed. Enable push to receive morning and evening reminders.
        </p>
        <NotificationRequest />
      </div>

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

