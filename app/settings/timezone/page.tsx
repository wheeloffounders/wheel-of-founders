'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ArrowLeft, Check } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const COMMON_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: -480 },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: -420 },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: -360 },
  { value: 'America/New_York', label: 'Eastern Time (New York)', offset: -300 },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', offset: -300 },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: 0 },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: 60 },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: 60 },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: 240 },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: 330 },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: 480 },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 540 },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: 600 },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)', offset: 780 },
]

export default function TimezoneSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState<string>('UTC')
  const [currentTimezone, setCurrentTimezone] = useState<string | null>(null)
  const [timezoneDetectedAt, setTimezoneDetectedAt] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const fetchTimezone = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('timezone, timezone_offset, timezone_detected_at')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile?.timezone) {
        setSelectedTimezone(profile.timezone)
        setCurrentTimezone(profile.timezone)
        setTimezoneDetectedAt(profile.timezone_detected_at || null)
      } else {
        // Auto-detect if not set
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
        setSelectedTimezone(detected)
        setCurrentTimezone(null)
      }

      setLoading(false)
    }

    fetchTimezone()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const session = await getUserSession()
    if (!session) return

    const tz = COMMON_TIMEZONES.find((t) => t.value === selectedTimezone)
    const offsetMinutes = tz?.offset || 0

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          timezone: selectedTimezone,
          timezone_offset: offsetMinutes,
          timezone_detected_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (error) throw error

      setCurrentTimezone(selectedTimezone)
      setMessage({ type: 'success', text: 'Timezone saved successfully!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save timezone',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatOffset = (offsetMinutes: number): string => {
    const hours = Math.floor(Math.abs(offsetMinutes) / 60)
    const minutes = Math.abs(offsetMinutes) % 60
    const sign = offsetMinutes >= 0 ? '+' : '-'
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-[#ef725c]" />
          <h1 className="text-3xl font-bold text-gray-900">Your Timezone</h1>
        </div>
        <p className="text-gray-600">
          Smart analysis runs between 2-5 AM in your local time.
        </p>
        {timezoneDetectedAt && (
          <p className="text-sm text-gray-500 mt-2">
            Previously detected: <strong>{currentTimezone}</strong> (you can change if incorrect)
          </p>
        )}
      </div>

      {/* Timezone Selector */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
          Select your timezone:
        </label>
        <select
          id="timezone"
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label} ({formatOffset(tz.offset)})
            </option>
          ))}
        </select>
      </div>

      {/* Analysis Schedule Info */}
      <div className="bg-gradient-to-r from-[#ef725c]/10 to-[#152b50]/10 rounded-xl p-6 mb-6 border-l-4 border-[#ef725c]">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ef725c]" />
          Analysis Schedule
        </h3>
        <p className="text-sm text-gray-700 mb-2">
          Based on <strong>{COMMON_TIMEZONES.find((t) => t.value === selectedTimezone)?.label || selectedTimezone}</strong>, analysis will run between:
        </p>
        <p className="text-lg font-bold text-gray-900 mb-2">2:00 AM - 5:00 AM your local time</p>
        <p className="text-xs text-gray-600">
          You&apos;ll get fresh insights when you wake up! 🌅
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || selectedTimezone === currentTimezone}
          className="px-6 py-3 bg-[#152b50] text-white rounded-lg font-semibold hover:bg-[#1a3565] transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            'Saving...'
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Timezone
            </>
          )}
        </button>
      </div>
    </div>
  )
}
