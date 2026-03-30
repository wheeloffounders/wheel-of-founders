'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isToday, startOfMonth, subDays, addYears } from 'date-fns'
import { Flame, AlertCircle, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import { StreamingIndicator } from '@/components/StreamingIndicator'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { useStreamingInsight } from '@/lib/hooks/useStreamingInsight'
import { getFeatureAccess } from '@/lib/features'
import { trackEvent } from '@/lib/analytics'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeekNavigator } from '@/components/ui/WeekNavigator'
import { DatePickerModal } from '@/components/ui/DatePickerModal'
import type { DayStatus } from '@/lib/date-utils'
import { EmergencyCard } from '@/components/EmergencyCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { colors, spacing } from '@/lib/design-tokens'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { PageSidebar } from '@/components/layout/PageSidebar'

type Severity = 'hot' | 'warm' | 'contained'

interface Emergency {
  id: string
  description: string
  severity: Severity
  notes: string | null
  resolved: boolean
  created_at: string
}

const EMPTY_DAY_STATUS: Record<string, DayStatus> = {}

const SEVERITY_OPTIONS: { value: Severity; label: string; emoji: string }[] = [
  { value: 'hot', label: 'Hot', emoji: '🔥' },
  { value: 'warm', label: 'Warm', emoji: '⚠️' },
  { value: 'contained', label: 'Contained', emoji: '✅' },
]

export default function EmergencyPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('hot')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [todayFires, setTodayFires] = useState<Emergency[]>([])
  const [loadingFires, setLoadingFires] = useState(true)
  const [aiCoachMessage, setAiCoachMessage] = useState<string | null>(null)
  const [emergencyInsightId, setEmergencyInsightId] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<string>('beta')
  const [fireDate, setFireDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthStatus, setMonthStatus] = useState<Record<string, DayStatus>>({})
  const { insight: streamingInsight, isStreaming, error: streamingError, startStream } = useStreamingInsight()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const fetchMonthStatus = useCallback(async (month: Date) => {
    const session = await getUserSession()
    if (!session) return
    const monthStr = format(month, 'yyyy-MM')
    const res = await fetch(`/api/user/month-status?month=${monthStr}`, { credentials: 'include' })
    if (res.ok) {
      const data = (await res.json()) as Record<string, DayStatus>
      setMonthStatus(data)
    }
  }, [])

  useEffect(() => {
    const month = startOfMonth(new Date(fireDate + 'T12:00:00'))
    void fetchMonthStatus(month)
  }, [fireDate, fetchMonthStatus])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
    }
    checkAuth()
  }, [router])

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

      const firesRes = await supabase
        .from('emergencies')
        .select('id, description, severity, notes, resolved, created_at')
        .eq('fire_date', fireDate)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (firesRes.error) {
        setError(firesRes.error.message)
        setTodayFires([])
        setAiCoachMessage(null)
        setEmergencyInsightId(null)
        setLoadingFires(false)
        return
      }

      const fires = firesRes.data ?? []
      setTodayFires(fires)

      // Only show insights for emergencies on this date (linked by emergency_id)
      if (!features.dailyMorningPrompt || fires.length === 0) {
        setAiCoachMessage(null)
        setEmergencyInsightId(null)
        setLoadingFires(false)
        return
      }

      const emergencyIds = fires.map((f: { id: string }) => f.id)
      const { data: prompts } = await supabase
        .from('personal_prompts')
        .select('id, prompt_text, emergency_id')
        .eq('user_id', session.user.id)
        .eq('prompt_type', 'emergency')
        .in('emergency_id', emergencyIds)
        .order('generated_at', { ascending: false })

      const firstPrompt = Array.isArray(prompts) && prompts.length > 0 ? prompts[0] : null
      if (firstPrompt?.prompt_text) {
        setAiCoachMessage(firstPrompt.prompt_text)
        setEmergencyInsightId((firstPrompt as { id?: string }).id ?? null)
      } else {
        setAiCoachMessage(null)
        setEmergencyInsightId(null)
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

      // Generate emergency insight (Pro only) - stream for faster feedback
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      if (features.dailyMorningPrompt) {
        try {
          console.log('🔍 Starting emergency insight stream...')
          await startStream(
            {
              promptType: 'emergency',
              userId: session.user.id,
              promptDate: fireDate,
              emergencyDescription: trimmed,
              severity,
            },
            async (fullPrompt) => {
              setAiCoachMessage(fullPrompt)
              if (inserted?.id) {
                setEmergencyInsightId(inserted.id)
                await supabase.from('emergencies').update({ insight: fullPrompt }).eq('id', inserted.id)
                await supabase.from('personal_prompts').insert({
                  user_id: session.user.id,
                  prompt_type: 'emergency',
                  prompt_text: fullPrompt,
                  prompt_date: fireDate,
                  emergency_id: inserted.id,
                  generated_at: new Date().toISOString(),
                })
              }
            }
          )
        } catch (error) {
          console.error('Failed to stream emergency AI insight:', error)
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

  const handleDelete = (id: string) => {
    setTodayFires((prev) => prev.filter((e) => e.id !== id))
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

  const minFire = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const maxFire = format(addYears(new Date(), 5), 'yyyy-MM-dd')
  const todayStrNav = format(new Date(), 'yyyy-MM-dd')
  const isDesktopSidebar = !isMobile

  return (
    <div className={isDesktopSidebar ? 'flex min-h-screen' : undefined}>
      {isDesktopSidebar ? (
        <aside
          className="flex w-64 shrink-0 min-h-screen flex-col border-r border-black/10 bg-transparent"
          aria-label="Emergency date navigation"
        >
          <PageSidebar
            variant="emergency"
            title="Firefighter Mode"
            subtitle="Log emergencies"
            titleIcon={<Flame className="h-6 w-6 text-white" aria-hidden />}
            selectedDate={fireDate}
            minDate={minFire}
            maxDate={maxFire}
            todayStr={todayStrNav}
            onSelectDate={(date) => setFireDate(date)}
            onPickDate={() => {
              setDisplayedMonth(startOfMonth(new Date(fireDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
        </aside>
      ) : null}
      <div
        className={
          isDesktopSidebar
            ? 'flex min-h-0 min-h-screen w-full min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950'
            : 'mx-auto w-full max-w-3xl px-4 pb-8 pt-0 transition-all duration-200 md:px-5'
        }
        style={isDesktopSidebar ? undefined : { paddingBottom: spacing['2xl'] }}
      >
        <div
          className={
            isDesktopSidebar
              ? 'mx-auto w-full max-w-3xl px-4 pb-8 pt-4 md:px-5'
              : 'contents'
          }
        >
      {isMobile ? (
        <>
          <PageHeader
            variant="emergency"
            title="Firefighter Mode"
            titleIcon={<Flame className="w-6 h-6 text-white" aria-hidden />}
            subtitle={format(new Date(fireDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            onCalendarClick={() => {
              setDisplayedMonth(startOfMonth(new Date(fireDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
          <WeekNavigator
            variant="emergency"
            selectedDate={fireDate}
            minDate={minFire}
            maxDate={maxFire}
            monthStatus={monthStatus}
            selectedPillClassName="bg-[#152b50]"
            onSelectDate={(date) => setFireDate(date)}
          />
        </>
      ) : null}

      <div className="mb-8" style={{ marginBottom: spacing['2xl'] }}>
        <DatePickerModal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          currentMonth={displayedMonth}
          onMonthChange={(month) => {
            setDisplayedMonth(month)
            void fetchMonthStatus(month)
          }}
          onSelectDate={(date) => {
            setFireDate(date)
            setCalendarOpen(false)
          }}
          monthStatus={monthStatus}
          selectedDate={fireDate}
        />
      </div>

      {/* Log Emergency Form - Card with amber accent */}
      <Card highlighted className="mb-8 bg-white dark:bg-gray-800 dark:bg-gray-800" style={{ marginBottom: spacing['2xl'], borderLeft: `4px solid ${colors.amber.DEFAULT}` }}>
        <CardHeader style={{ padding: spacing.xl }}>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
            <Zap className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
            {isToday(new Date(fireDate)) ? 'Track the disruption' : `Track the disruption for ${format(new Date(fireDate), 'MMMM d')}`}
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: spacing.xl }}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="emergency-desc"
              className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100 dark:text-white"
            >
              What&apos;s the fire?
            </label>
            <SpeechToTextInput
              id="emergency-desc"
              as="textarea"
              rows={1}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Server down, key client escalation..."
              className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-offset-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100 dark:text-white">
              Severity
            </label>
            <div className="flex gap-3">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200"
                  style={{
                    backgroundColor: severity === opt.value ? colors.amber.DEFAULT : colors.neutral.background,
                    color: severity === opt.value ? '#FFFFFF' : colors.neutral.text.secondary,
                  }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="emergency-notes"
              className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100 dark:text-white"
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
              className="w-full px-4 py-2 rounded-lg resize-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:text-white"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg flex items-center gap-2 border bg-[#FFF0EC] dark:bg-amber-900/30 border-[#EF725C] dark:border-amber-600 text-gray-900 dark:text-gray-100 dark:text-white">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#EF725C]" />
            {error}
          </div>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full"
          style={{ backgroundColor: colors.amber.DEFAULT, color: '#FFFFFF' }}
        >
          {saving ? 'Tracking...' : 'Track the disruption'}
        </Button>
        </CardContent>
      </Card>

      {/* Today's Fires - Card with navy accent */}
      <Card highlighted className="mb-8 bg-white dark:bg-gray-800 dark:bg-gray-800" style={{ marginBottom: spacing['2xl'], borderLeft: `4px solid ${colors.navy.DEFAULT}` }}>
        <CardHeader style={{ padding: spacing.xl }}>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
            <Flame className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
            {isToday(new Date(fireDate)) ? `Today's Fires` : `Fires for ${format(new Date(fireDate), 'MMM d, yyyy')}`}
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: spacing.xl }}>
        {loadingFires ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Loading...</p>
        ) : todayFires.length === 0 ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
            {isToday(new Date(fireDate)) ? 'No emergencies logged today. Stay focused on your Power List.' : `No emergencies logged for ${format(new Date(fireDate), 'MMMM d')}.`}
          </p>
        ) : (
          <ul className="space-y-3">
            {todayFires.map((fire) => (
              <EmergencyCard
                key={fire.id}
                emergency={fire}
                onDelete={handleDelete}
                onToggleResolved={toggleResolved}
                severityOptions={SEVERITY_OPTIONS}
              />
            ))}
          </ul>
        )}
        </CardContent>
      </Card>

      {/* Mrs. Deer AI Coach - Emergency Insight (permanent, always shown if exists) */}
      {(aiCoachMessage || isStreaming || streamingError) && (
        <>
          {isStreaming && <StreamingIndicator expression="empathetic" className="mb-4" />}
          <AICoachPrompt
            message={isStreaming ? (streamingInsight || '...') : (streamingError ? `[AI ERROR] ${streamingError}` : aiCoachMessage!)}
            trigger="emergency"
            onClose={() => {}}
            insightId={emergencyInsightId ?? undefined}
          />
        </>
      )}
        </div>
      </div>
    </div>
  )
}
