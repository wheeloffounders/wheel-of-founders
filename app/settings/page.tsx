'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Mail, Check, Download, FileText, MessageSquare, Loader2, Bell, Target, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { getUserGoal, saveUserGoals, UserGoal, getUserLanguage } from '@/lib/user-language'
import Link from 'next/link'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { SettingsVersion } from '@/components/SettingsVersion'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(true)
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(true)
  const [exportNotificationEnabled, setExportNotificationEnabled] = useState(true)
  const [communityInsightsEnabled, setCommunityInsightsEnabled] = useState(true)
  const [emailAddress, setEmailAddress] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userTier, setUserTier] = useState<string>('beta')
  const [exporting, setExporting] = useState(false)
  const [exportType, setExportType] = useState<'full_history' | 'yearly_report' | 'custom_range' | 'five_year_trends'>('full_history')
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf' | 'all'>('all')
  const [exportDateStart, setExportDateStart] = useState('')
  const [exportDateEnd, setExportDateEnd] = useState('')
  const [primaryGoal, setPrimaryGoal] = useState<UserGoal | null>(null)
  const [savingGoal, setSavingGoal] = useState(false)
  const [hasDuo, setHasDuo] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
      await fetchSettings(session.user.id)
      // Load user's goal
      const goal = await getUserGoal(session.user.id)
      setPrimaryGoal(goal)
    }
    checkAuth()
  }, [router])

  const fetchSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('weekly_email_enabled, welcome_email_enabled, export_notification_enabled, community_insights_enabled, email_address, preferred_name, name, plan_type')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        // Non-fatal: settings table/row might not exist yet
        console.warn(
          'Could not fetch settings (user_profiles may not exist yet):',
          (error as any)?.message || error
        )
      }

      if (data) {
        setWeeklyEmailEnabled(data.weekly_email_enabled ?? true)
        setWelcomeEmailEnabled(data.welcome_email_enabled ?? true)
        setExportNotificationEnabled(data.export_notification_enabled ?? true)
        setCommunityInsightsEnabled(data.community_insights_enabled ?? true)
        setEmailAddress(data.email_address || '')
        setPreferredName(data.preferred_name || data.name || '')
        setHasDuo((data as { plan_type?: string }).plan_type === 'duo_primary' || (data as { plan_type?: string }).plan_type === 'duo_secondary')
      } else {
        // Get email from auth user
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user?.email) {
          setEmailAddress(authData.user.email)
        }
      }
    } catch (error) {
      console.warn('Unexpected error fetching settings:', (error as any)?.message || error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const session = await getUserSession()
    if (!session) {
      router.push('/login')
      return
    }

    try {
      // Get email from auth if not set
      let finalEmail = emailAddress
      if (!finalEmail) {
        const { data: authData } = await supabase.auth.getUser()
        finalEmail = authData?.user?.email || ''
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: session.user.id,
            weekly_email_enabled: weeklyEmailEnabled,
            welcome_email_enabled: welcomeEmailEnabled,
            export_notification_enabled: exportNotificationEnabled,
            community_insights_enabled: communityInsightsEnabled,
            email_address: finalEmail,
            preferred_name: preferredName.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (error) throw error

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-5 py-8">
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-5 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#ef725c]" />
          Settings
        </h1>
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mt-2">Manage your account preferences</p>
        <Link
          href="/feedback"
          className="mt-3 inline-flex items-center gap-2 text-sm text-[#ef725c] hover:underline"
        >
          <MessageSquare className="w-4 h-4" />
          Give Feedback
        </Link>
      </div>

      <div className="space-y-6">
      {/* 1. Duo Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="w-5 h-5 text-[#ef725c]" />
              Duo Plan
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Invite a partner and save up to 35%
            </p>
          </div>
          <Link
            href={hasDuo ? '/settings/duo' : '/checkout?plan=duo'}
            className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] text-sm font-medium shrink-0"
          >
            {hasDuo ? 'Manage Duo' : 'Join Plan'}
          </Link>
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>✓ Two separate Pro accounts</p>
          <p>✓ Single bill</p>
          <p>✓ From $25/month each with yearly</p>
        </div>
      </div>

      {/* 2. Personalization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 md:px-5 py-4 md:py-5 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Personalization</h2>
        </div>
        <div className="mb-6">
          <label htmlFor="preferred-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Name
          </label>
          <SpeechToTextInput
            type="text"
            id="preferred-name"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
            placeholder="How should we address you? (e.g., Vanie)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This name will be used throughout the app instead of &quot;Founder&quot;. Leave empty to use &quot;Founder&quot;.
          </p>
        </div>
      </div>

      {/* 3. Notification Reminders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 md:px-5 py-4 md:py-5 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white flex items-center gap-3">
              <Bell className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
              Notification Reminders
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Choose when you&apos;d like gentle nudges for morning planning and evening reflection.
            </p>
          </div>
          <Link
            href="/settings/notifications"
            className="px-4 py-2 text-gray-900 dark:text-gray-100 border border-[#152b50] dark:border-[#334155] rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition text-sm font-medium shrink-0"
          >
            Manage Notifications
          </Link>
        </div>
      </div>

      {/* 4. Goals & Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 md:px-5 py-4 md:py-5 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Goals & Preferences</h2>
        </div>
        <div className="mb-6">
          <label htmlFor="primary-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What brings you here?
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            This helps us personalize your experience throughout the app.
          </p>
          <select
            id="primary-goal"
            value={primaryGoal || 'general_clarity'}
            onChange={(e) => setPrimaryGoal(e.target.value as UserGoal)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
          >
            <option value="find_purpose">🎯 Finding my purpose</option>
            <option value="build_significance">🌟 Build a meaningful business</option>
            <option value="reduce_overwhelm">🌊 Reducing overwhelm</option>
            <option value="break_through_stuck">🚀 Breaking through stuck</option>
            <option value="improve_focus">🔍 Improving focus</option>
            <option value="build_systems">⚙️ Building systems</option>
            <option value="general_clarity">💡 General clarity</option>
            <option value="stay_motivated">💪 Staying motivated</option>
            <option value="find_calm">🧘 Finding calm</option>
          </select>
          <button
            type="button"
            onClick={async () => {
              if (!primaryGoal) return
              setSavingGoal(true)
              try {
                const session = await getUserSession()
                if (!session) return
                await saveUserGoals(session.user.id, primaryGoal)
                setMessage({ type: 'success', text: 'Personalization updated! The app will refresh to reflect your changes.' })
                setTimeout(() => {
                  window.location.reload()
                }, 1500)
              } catch (error) {
                setMessage({
                  type: 'error',
                  text: error instanceof Error ? error.message : 'Failed to save personalization',
                })
              } finally {
                setSavingGoal(false)
              }
            }}
            disabled={savingGoal}
            className="mt-3 px-4 py-2 bg-[#152b50] text-white rounded-lg text-sm font-medium hover:bg-[#1a3565] transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {savingGoal ? 'Saving...' : 'Save Personalization'}
          </button>
        </div>
      </div>

      {/* 5. Email Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 md:px-5 py-4 md:py-5 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Email Preferences</h2>
        </div>

        {/* Email Address */}
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <SpeechToTextInput
            type="email"
            id="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
            placeholder="your@email.com"
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
            This email will be used for weekly summary emails.
          </p>
        </div>

        {/* Weekly Email Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg mb-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">Weekly Summary Emails</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Receive a personalized weekly summary every Sunday at 8 PM with your focus score
              trends, accomplishments, and insights.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWeeklyEmailEnabled(!weeklyEmailEnabled)}
            className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 ${
              weeklyEmailEnabled ? 'bg-[#ef725c]' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
            }`}
            role="switch"
            aria-checked={weeklyEmailEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow ring-0 transition duration-200 ease-in-out ${
                weeklyEmailEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Welcome Email Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg mb-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">Welcome Email</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Receive a welcome email after signup with tips to get started.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWelcomeEmailEnabled(!welcomeEmailEnabled)}
            className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 ${
              welcomeEmailEnabled ? 'bg-[#ef725c]' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
            }`}
            role="switch"
            aria-checked={welcomeEmailEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow ring-0 transition duration-200 ease-in-out ${
                welcomeEmailEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Export Notification Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg mb-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">Export Ready Notification</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Receive an email when your data export is ready with a download link.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExportNotificationEnabled(!exportNotificationEnabled)}
            className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 ${
              exportNotificationEnabled ? 'bg-[#ef725c]' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
            }`}
            role="switch"
            aria-checked={exportNotificationEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow ring-0 transition duration-200 ease-in-out ${
                exportNotificationEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Community Insights Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">Community Insights</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              See anonymized insights from fellow founders. Your data contributes to these patterns but is never individually identified.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCommunityInsightsEnabled(!communityInsightsEnabled)}
            className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 ${
              communityInsightsEnabled ? 'bg-[#ef725c]' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
            }`}
            role="switch"
            aria-checked={communityInsightsEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow ring-0 transition duration-200 ease-in-out ${
                communityInsightsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
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
          <div className="flex items-center gap-2">
            {message.type === 'success' && <Check className="w-5 h-5" />}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-[#152b50] text-white rounded-lg font-semibold hover:bg-[#1a3565] transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* 6. Data Export */}
      <div id="data-export" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 md:px-5 py-4 md:py-5 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Download className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Data Export</h2>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-4">
          Export your data in JSON, CSV, or PDF format. Files are stored for 7 days—export anytime to access.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="export-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Export Type
            </label>
            <select
              id="export-type"
              value={exportType}
              onChange={(e) => setExportType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
            >
              <option value="full_history">Full History</option>
              <option value="yearly_report">Yearly Report</option>
              <option value="custom_range">Custom Date Range</option>
              {getFeatureAccess({ tier: userTier }).fiveYearTrends && (
                <option value="five_year_trends">5-Year Trends</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="export-format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Format
            </label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'pdf' | 'all')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
            >
              <option value="all">All (JSON + CSV + PDF)</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          {exportType === 'custom_range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="export-date-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  id="export-date-start"
                  type="date"
                  value={exportDateStart}
                  onChange={(e) => setExportDateStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="export-date-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  id="export-date-end"
                  type="date"
                  value={exportDateEnd}
                  onChange={(e) => setExportDateEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              setMessage(null)
              setExporting(true)
              try {
                const session = await getUserSession()
                if (!session) {
                  setMessage({ type: 'error', text: 'Please log in to export your data.' })
                  setExporting(false)
                  return
                }

                if (exportType === 'custom_range' && (!exportDateStart || !exportDateEnd)) {
                  setMessage({ type: 'error', text: 'Please select start and end dates for custom range.' })
                  setExporting(false)
                  return
                }

                const body: Record<string, unknown> = { exportType, format: exportFormat }
                if (exportType === 'custom_range') {
                  body.dateRangeStart = exportDateStart
                  body.dateRangeEnd = exportDateEnd
                }

                const { data: sessionResult } = await supabase.auth.getSession()
                const currentSession = sessionResult?.session
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (currentSession?.access_token) {
                  headers['Authorization'] = `Bearer ${currentSession.access_token}`
                }

                const response = await fetch('/api/export', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(body),
                  credentials: 'include',
                })

                const data = await response.json()

                if (!response.ok) {
                  if (response.status === 401) {
                    setMessage({ type: 'error', text: 'Session expired. Please log in again.' })
                    router.push('/login?returnTo=/settings#data-export')
                    return
                  }
                  throw new Error(data.error || 'Export failed')
                }

                // Use storage download URL(s) if available, otherwise fall back to inline/blob download
                const primaryUrl = data.pdfDownloadUrl ?? data.csvDownloadUrl ?? data.downloadUrl
                if (primaryUrl) {
                  const a = document.createElement('a')
                  a.href = primaryUrl
                  a.download = data.pdfFileName ?? data.csvFileName ?? data.fileName ?? 'export'
                  a.target = '_blank'
                  a.rel = 'noopener noreferrer'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  setMessage({ type: 'success', text: 'Export ready! Download started.' })
                  setTimeout(() => setMessage(null), 5000)
                } else if (data.pdfBase64) {
                  const bin = atob(data.pdfBase64)
                  const arr = new Uint8Array(bin.length)
                  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
                  const blob = new Blob([arr], { type: 'application/pdf' })
                  const blobUrl = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = blobUrl
                  a.download = data.pdfFileName ?? 'export.pdf'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(blobUrl)
                  setMessage({ type: 'success', text: 'Export downloaded successfully!' })
                  setTimeout(() => setMessage(null), 5000)
                } else if (data.csvContentInline) {
                  const blob = new Blob([data.csvContentInline], { type: 'text/csv' })
                  const blobUrl = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = blobUrl
                  a.download = data.csvFileName ?? 'export.csv'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(blobUrl)
                  setMessage({ type: 'success', text: 'Export downloaded successfully!' })
                  setTimeout(() => setMessage(null), 5000)
                } else if (data.data != null) {
                  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = data.fileName || 'export.json'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  setMessage({ type: 'success', text: 'Export downloaded successfully!' })
                  setTimeout(() => setMessage(null), 5000)
                } else if (data.exportId) {
                  // Fallback: fetch signed URL from download endpoint
                  const dlFormat = exportFormat === 'all' ? 'json' : exportFormat
                  const dlRes = await fetch(`/api/export/${data.exportId}/download?format=${dlFormat}`, {
                    credentials: 'include',
                    headers: currentSession?.access_token
                      ? { Authorization: `Bearer ${currentSession.access_token}` }
                      : {},
                  })
                  const dlData = await dlRes.json()
                  if (dlData.downloadUrl) {
                    const a = document.createElement('a')
                    a.href = dlData.downloadUrl
                    a.download = data.pdfFileName ?? data.csvFileName ?? data.fileName ?? 'export'
                    a.target = '_blank'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    setMessage({ type: 'success', text: 'Export downloaded successfully!' })
                    setTimeout(() => setMessage(null), 5000)
                  } else {
                    setMessage({ type: 'error', text: 'Export ready but download failed. Try again.' })
                  }
                } else {
                  setMessage({ type: 'error', text: 'Export completed but no data received. Try again.' })
                }
              } catch (error) {
                setMessage({
                  type: 'error',
                  text: error instanceof Error ? error.message : 'Export failed',
                })
              } finally {
                setExporting(false)
              }
            }}
            disabled={exporting}
            aria-busy={exporting}
            aria-live="polite"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#152b50] text-white rounded-lg font-semibold hover:bg-[#1a3565] transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            <span>{exporting ? 'Generating Export...' : 'Download Export'}</span>
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400">
            {getFeatureAccess({ tier: userTier }).canViewFullHistory
              ? 'Your full history will be included in the export.'
              : 'Free tier exports include the last 2 days only. Upgrade to export full history.'}
          </p>
        </div>
      </div>

      {/* 7. App Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">App Information</h3>
        <SettingsVersion />
      </div>
      </div>
    </div>
  )
}
