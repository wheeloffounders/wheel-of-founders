'use client'

import { useState, useEffect } from 'react'
import { format, isToday } from 'date-fns'
import { Flame, AlertCircle, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation' // Add useRouter
import { getUserSession } from '@/lib/auth' // Add getUserSession
import { AICoachPrompt } from '@/components/AICoachPrompt'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { getFeatureAccess } from '@/lib/features'
import { trackEvent } from '@/lib/analytics'
import { DateSelector } from '@/components/DateSelector'

type Severity = 'hot' | 'warm' | 'contained'

interface Emergency {
  id: string
  description: string
  severity: Severity
  notes: string | null
  resolved: boolean
  created_at: string
}

const SEVERITY_OPTIONS: { value: Severity; label: string; emoji: string }[] = [
  { value: 'hot', label: 'Hot', emoji: '🔥' },
  { value: 'warm', label: 'Warm', emoji: '⚠️' },
  { value: 'contained', label: 'Contained', emoji: '✅' },
]

export default function EmergencyPage() {
  const router = useRouter() // Initialize useRouter

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
    }
    checkAuth()
  }, [router]) // Add router to dependency array
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('hot')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [todayFires, setTodayFires] = useState<Emergency[]>([])
  const [loadingFires, setLoadingFires] = useState(true)
  const [aiCoachMessage, setAiCoachMessage] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<string>('beta')
  const [fireDate, setFireDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const fetchTodayFires = async () => {
      setLoadingFires(true) // Ensure loading is set
      const session = await getUserSession()
      if (!session) {
        // Router push is handled by the main useEffect, just set loading and return
        setLoadingFires(false)
        return
      }

      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })

      const [firesRes, emergencyInsightRes] = await Promise.all([
        supabase
          .from('emergencies')
          .select('id, description, severity, notes, resolved, created_at')
          .eq('fire_date', fireDate)
          .eq('user_id', session.user.id) // Filter by user_id
          .order('created_at', { ascending: false }),
        // Fetch emergency insight for this date (if exists)
        // Use generated_at to filter by date since prompt_date column may not exist yet
        features.dailyMorningPrompt
          ? (async () => {
              const fireDateStart = new Date(fireDate + 'T00:00:00')
              const fireDateEnd = new Date(fireDate + 'T23:59:59')
              
              const { data, error } = await supabase
                .from('personal_prompts')
                .select('prompt_text, prompt_type, generated_at')
                .eq('user_id', session.user.id)
                .gte('generated_at', fireDateStart.toISOString())
                .lte('generated_at', fireDateEnd.toISOString())
                .eq('prompt_type', 'emergency')
                .order('generated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              
              return { data, error }
            })()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (firesRes.error) {
        setError(firesRes.error.message) // Display error
        setTodayFires([])
      } else {
        setTodayFires(firesRes.data ?? [])
      }
      
        // ALWAYS load emergency insight from database (permanent persistence)
        // Priority: 1) Today's insight for this date, 2) Most recent insight of any date
        let insightToShow = null
        
        if (emergencyInsightRes.error) {
          console.error('❌ Error loading emergency insight:', emergencyInsightRes.error)
        }
        
        if (emergencyInsightRes.data?.prompt_text) {
          // Found insight for this specific date
          insightToShow = emergencyInsightRes.data.prompt_text
          console.log('✅ Loading emergency insight (date-specific):', insightToShow.substring(0, 50))
        } else {
          // No insight for this date - check for ANY emergency insight (most recent)
          console.log('⚠️ No emergency insight found for date:', fireDate, '- checking for any recent insight')
          const { data: anyInsight, error: anyError } = await supabase
            .from('personal_prompts')
            .select('prompt_text, prompt_type, generated_at')
            .eq('user_id', session.user.id)
            .eq('prompt_type', 'emergency')
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (anyError) {
            console.error('❌ Error loading any emergency insight:', anyError)
          } else if (anyInsight?.prompt_text) {
            insightToShow = anyInsight.prompt_text
            console.log('✅ Found emergency insight (most recent):', insightToShow.substring(0, 50))
          } else {
            console.log('⚠️ No emergency insights found in database')
          }
        }
        
        // Always set the insight if we found one (ensures persistence across navigation)
        if (insightToShow) {
          setAiCoachMessage(insightToShow)
        } else {
          // Only clear if we're sure there's no insight in database
          setAiCoachMessage(null)
        }
      
      setLoadingFires(false)
    }

    fetchTodayFires()
  }, [fireDate, setError])

  const handleSave = async () => {
    const trimmed = description.trim()
    if (!trimmed) {
      setError('Please describe the emergency.')
      return
    }

    setSaving(true)
    setError(null)

    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      setSaving(false)
      return
    }

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('emergencies')
        .insert({
          user_id: session.user.id, // Add user_id
          fire_date: fireDate,
          description: trimmed,
          severity,
          notes: notes.trim() || null,
        })
        .select('id, description, severity, notes, resolved, created_at')
        .single()

      if (insertError) throw insertError

      trackEvent('emergency_logged', {
        description_length: trimmed.length,
        severity,
        fire_date: fireDate,
      })

      // Generate emergency insight (Pro only) - always generate, regardless of date
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      if (features.dailyMorningPrompt) {
        try {
          const res = await fetch('/api/personal-coaching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              emergencyDescription: trimmed, 
              severity,
              userId: session.user.id,
              promptDate: fireDate, // Store with the selected date
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.prompt) {
              setAiCoachMessage(data.prompt)
            }
          } else {
            const errorData = await res.json().catch(() => ({}))
            console.error('API error:', res.status, errorData)
          }
        } catch (error) {
          console.error('Failed to load emergency AI insight:', error)
        }
      }

      setDescription('')
      setNotes('')
      setSeverity('hot')
      if (inserted) {
        setTodayFires((prev) => [inserted, ...prev])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to log. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleResolved = async (id: string, resolved: boolean) => {
    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      return
    }

    const { error: updateError } = await supabase
      .from('emergencies')
      .update({ resolved, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id) // Filter by user_id

    if (!updateError) {
      setTodayFires((prev) =>
        prev.map((e) => (e.id === id ? { ...e, resolved } : e))
      )
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#152b50] dark:text-[#E2E8F0] mb-2 flex items-center gap-2">
        <Flame className="w-8 h-8 text-[#ef725c]" />
        Firefighter Mode
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {isToday(new Date(fireDate)) ? 'Log urgent tasks that pull you off your Power List' : `Viewing emergencies for ${format(new Date(fireDate), 'MMMM d, yyyy')}`}
      </p>
      <DateSelector selectedDate={fireDate} onDateChange={setFireDate} maxDaysBack={30} className="mb-8" />

      {/* Log Emergency Form */}
      <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-l-4 border-[#ef725c] dark:border-[#ef725c]/70">
        <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#ef725c]" />
          {isToday(new Date(fireDate)) ? 'Track the disruption' : `Track the disruption for ${format(new Date(fireDate), 'MMMM d')}`}
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="emergency-desc"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              What&apos;s the fire?
            </label>
            <SpeechToTextInput
              id="emergency-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Server down, key client escalation..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <div className="flex gap-3">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    severity === opt.value
                      ? 'bg-[#ef725c] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="emergency-notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes (optional)
            </label>
            <SpeechToTextInput
              as="textarea"
              id="emergency-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, next steps..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent resize-none text-gray-900"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-3 px-4 bg-[#ef725c] text-white font-semibold rounded-lg hover:bg-[#e8654d] disabled:opacity-70 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Tracking...' : 'Track the disruption'}
        </button>
      </section>

      {/* Today's Fires */}
      <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 border-l-4 border-[#152b50] dark:border-[#152b50]/70">
        <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-4">
          {isToday(new Date(fireDate)) ? `Today's Fires` : `Fires for ${format(new Date(fireDate), 'MMM d, yyyy')}`}
        </h2>

        {loadingFires ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
        ) : todayFires.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isToday(new Date(fireDate)) ? 'No emergencies logged today. Stay focused on your Power List.' : `No emergencies logged for ${format(new Date(fireDate), 'MMMM d')}.`}
          </p>
        ) : (
          <ul className="space-y-3">
            {todayFires.map((fire) => (
              <li
                key={fire.id}
                className={`p-4 rounded-lg border ${
                  fire.resolved
                    ? 'bg-gray-50 border-gray-200 opacity-75'
                    : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          fire.severity === 'hot'
                            ? 'bg-red-100 text-red-700'
                            : fire.severity === 'warm'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {SEVERITY_OPTIONS.find((s) => s.value === fire.severity)
                          ?.emoji}{' '}
                        {fire.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(fire.created_at), 'h:mm a')}
                      </span>
                    </div>
                    <p
                      className={`text-gray-900 ${
                        fire.resolved ? 'line-through text-gray-600' : ''
                      }`}
                    >
                      {fire.description}
                    </p>
                    {fire.notes && (
                      <p className="text-sm text-gray-600 mt-1">{fire.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleResolved(fire.id, !fire.resolved)}
                    className={`text-sm font-medium px-2 py-1 rounded shrink-0 ${
                      fire.resolved
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {fire.resolved ? 'Reopen' : 'Resolved'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mrs. Deer AI Coach - Emergency Insight (permanent, always shown if exists) */}
      {aiCoachMessage && (
        <AICoachPrompt
          message={aiCoachMessage}
          trigger="evening_after"
          onClose={() => {
            // Insights are permanent - don't actually close them
            // This handler is kept for component compatibility but does nothing
          }}
        />
      )}
    </div>
  )
}
