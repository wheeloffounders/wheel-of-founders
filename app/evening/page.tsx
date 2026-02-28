'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday } from 'date-fns'
import { Moon, Heart, Award, Lightbulb, AlertCircle, Check, Mountain, Plus, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth' // Add getUserSession
import { CelebrationModal } from '@/components/CelebrationModal'
import { calculateStreak, isStreakMilestone } from '@/lib/streak'
import { StreakCelebrationModal } from '@/components/StreakCelebrationModal'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { MrsDeerAdaptivePrompt } from '@/components/MrsDeerAdaptivePrompt'
import { getFeatureAccess } from '@/lib/features'
import { DateSelector } from '@/components/DateSelector'
import { useUserLanguage } from '@/lib/use-user-language'
import { trackEvent } from '@/lib/analytics'
import { trackFunnelStep } from '@/lib/analytics/track-funnel'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors, typography, spacing } from '@/lib/design-tokens'
import { LoadingWithRetry } from '@/components/LoadingWithRetry'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useStreamingInsight } from '@/lib/hooks/useStreamingInsight'
import { StreamingIndicator } from '@/components/StreamingIndicator'

const MOOD_OPTIONS = [
  { value: 5, label: 'Great', emoji: '😊' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 2, label: 'Tough', emoji: '😞' },
  { value: 1, label: 'Rough', emoji: '😫' },
]

const ENERGY_OPTIONS = [
  { value: 5, label: 'Very High', emoji: '🔋🔋🔋🔋🔋' },
  { value: 4, label: 'High', emoji: '🔋🔋🔋🔋' },
  { value: 3, label: 'Medium', emoji: '🔋🔋🔋' },
  { value: 2, label: 'Low', emoji: '🔋🔋' },
  { value: 1, label: 'Very Low', emoji: '🔋' },
]

interface Task {
  id: string
  description: string
  completed: boolean
  needle_mover?: boolean
}

export default function EveningPage() {
  const router = useRouter()
  const lang = useUserLanguage() // Personalized language
  
  // All hooks must be at the top level - no conditional calls
  const [userTier, setUserTier] = useState<string>('beta')
  const [aiCoachMessage, setAiCoachMessage] = useState<string | null>(null)
  const [aiCoachTrigger, setAiCoachTrigger] = useState<'evening_after' | null>(null)
  const [journal, setJournal] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [wins, setWins] = useState<string[]>([''])
  const [lessons, setLessons] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [morningTasks, setMorningTasks] = useState<Task[]>([])
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [hasCelebratedToday, setHasCelebratedToday] = useState(false)
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [retryTrigger, setRetryTrigger] = useState(0)
  // Fix hydration: initialize with empty string, set in useEffect
  const [reviewDate, setReviewDate] = useState<string>('')
  const funnelStepRef = useRef<Set<number>>(new Set())
  const prefersReducedMotion = useReducedMotion()
  const [detectedPattern, setDetectedPattern] = useState<{
    kind: 'behavior' | 'coaching'
    patternType: string
    message: string
    suggestedAction: string
    ctaLabel?: string
    context?: string
  } | null>(null)
  const [confirmDeleteWin, setConfirmDeleteWin] = useState<number | null>(null)
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<number | null>(null)

  const { insight: streamingInsight, isStreaming, error: streamingError, startStream } = useStreamingInsight()

  const fireFunnelStep = useCallback((step: number, name: string) => {
    if (funnelStepRef.current.has(step)) return
    funnelStepRef.current.add(step)
    trackFunnelStep('evening_flow', name, step)
  }, [])

  const checkPatternDetection = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback/detect-patterns')
      const data = await res.json()
      if (data.pattern?.message) {
        setDetectedPattern(data.pattern)
      }
    } catch {
      // Ignore
    }
  }, [])

  // Show streaming errors in the coach message
  useEffect(() => {
    if (streamingError && aiCoachTrigger === 'evening_after') {
      setAiCoachMessage(`[AI ERROR] ${streamingError}`)
    }
  }, [streamingError, aiCoachTrigger])

  // Initialize reviewDate on client side to avoid hydration mismatch
  useEffect(() => {
    if (reviewDate === '') {
      setReviewDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [])

  // Auth check useEffect
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
  }, [router])

  // Check if celebration has already been shown for today (per-device)
  useEffect(() => {
    if (typeof window === 'undefined' || !reviewDate) return
    const key = `evening_celebration_shown_${reviewDate}`
    const value = window.localStorage.getItem(key)
    if (value === 'true') {
      setHasCelebratedToday(true)
    }
  }, [reviewDate])

  useEffect(() => {
    if (!reviewDate) return // Wait for reviewDate to be initialized
    const fetchTodayReviewAndTasks = async () => {
      setLoading(true) // Set loading to true here
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })

      // Fetch Evening Review
      const { data: reviewData, error: reviewError } = await supabase
        .from('evening_reviews')
        .select('journal, mood, energy, wins, lessons')
        .eq('review_date', reviewDate)
        .eq('user_id', session.user.id) // Filter by user_id
        .maybeSingle()
      
      // Fetch post_evening insight (Mrs. Deer)
      const [postEveningInsightRes] = await Promise.all([
        // Fetch post_evening insight for THIS EXACT DATE ONLY (no cross-day fallback)
        features.dailyPostEveningPrompt
          ? (async () => {
              console.log(`[Evening Page Load] Date: ${reviewDate}`)
              
              const { data, error } = await supabase
                .from('personal_prompts')
                .select('id, prompt_text, prompt_type, prompt_date, generated_at')
                .eq('user_id', session.user.id)
                .eq('prompt_type', 'post_evening')
                .eq('prompt_date', reviewDate)
                .order('generated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              console.log('🔍 Loading post_evening insight:', {
                user_id: session.user.id,
                prompt_type: 'post_evening',
                prompt_date: reviewDate,
                found: !!data,
                id: (data as { id?: string })?.id,
                error: error?.message,
              })
              if (error) {
                console.error(`[Evening Page Load] Error loading post_evening insight for ${reviewDate}:`, error)
              } else if (data) {
                console.log(`[Evening Page Load] Evening insight found for ${reviewDate}:`, (data as { prompt_text?: string }).prompt_text?.substring(0, 50))
              } else {
                console.log(`[Evening Page Load] No evening insight found for ${reviewDate}`)
              }
              
              return { data, error }
            })()
          : Promise.resolve({ data: null, error: null }),
      ])
      
      // Show evening insight ONLY when:
      // 1. User has saved a review for this exact date
      // 2. An evening insight exists for this exact date
      // NO FALLBACKS - if no review or no insight for this date, show nothing
      const hasEveningReview = !!reviewData
      console.log(`[Evening Page Load] Has evening review for ${reviewDate}:`, hasEveningReview)
      
      let insightToShow = null
      if (postEveningInsightRes.error) {
        console.error(`[Evening Page Load] Error loading post_evening insight:`, postEveningInsightRes.error)
      }
      
      // STRICT: Only show if BOTH review exists AND insight exists for this exact date
      if (hasEveningReview && postEveningInsightRes.data?.prompt_text) {
        insightToShow = postEveningInsightRes.data.prompt_text
        console.log(`[Evening Page Load] Final insight displayed for ${reviewDate}`)
      } else {
        console.log(`[Evening Page Load] No insight displayed - review: ${hasEveningReview}, insight: ${!!postEveningInsightRes.data?.prompt_text}`)
      }
      
      if (insightToShow) {
        setAiCoachMessage(insightToShow)
        setAiCoachTrigger('evening_after')
      } else {
        setAiCoachMessage(null)
        setAiCoachTrigger(null)
      }

      // Check for pattern-based Mrs. Deer feedback (3+ mentions of same theme in last 14 days)
      checkPatternDetection()

      trackEvent('evening_page_view', { has_existing_review: !!reviewData, review_date: reviewDate })
      fireFunnelStep(1, 'evening_page_view')

      if (reviewError) {
        setError(reviewError.message) // Display error
      } else if (reviewData) {
        setJournal(reviewData.journal ?? '')
        setMood(reviewData.mood ?? null)
        setEnergy(reviewData.energy ?? null)
        
        // Parse wins: try JSON array first, fallback to string (old format)
        const winsData = reviewData.wins
        if (!winsData) {
          setWins([''])
        } else if (typeof winsData === 'string') {
          try {
            const parsed = JSON.parse(winsData)
            setWins(Array.isArray(parsed) && parsed.length > 0 ? parsed : [''])
          } catch {
            // Old format: single string, convert to array
            setWins(winsData.trim() ? [winsData] : [''])
          }
        } else {
          setWins([''])
        }
        
        // Parse lessons: try JSON array first, fallback to string (old format)
        const lessonsData = reviewData.lessons
        if (!lessonsData) {
          setLessons([''])
        } else if (typeof lessonsData === 'string') {
          try {
            const parsed = JSON.parse(lessonsData)
            setLessons(Array.isArray(parsed) && parsed.length > 0 ? parsed : [''])
          } catch {
            // Old format: single string, convert to array
            setLessons(lessonsData.trim() ? [lessonsData] : [''])
          }
        } else {
          setLessons([''])
        }
      }

      // Fetch Morning Tasks for today (select * - completed column may not exist yet)
      const { data: tasksData, error: tasksError } = await supabase
        .from('morning_tasks')
        .select('*')
        .eq('plan_date', reviewDate)
        .eq('user_id', session.user.id)
        .order('task_order', { ascending: true })

      if (tasksError) {
        setError(tasksError.message)
        setMorningTasks([])
      } else if (tasksData) {
        setMorningTasks(
          tasksData.map((t) => ({
            id: (t as { id: string }).id,
            description: (t as { description?: string }).description ?? '',
            completed: (t as { completed?: boolean }).completed ?? false,
            needle_mover: (t as { needle_mover?: boolean }).needle_mover ?? false,
          }))
        )
      } else {
        setMorningTasks([])
      }

      setLoading(false)
    }

    fetchTodayReviewAndTasks()
  }, [reviewDate, checkPatternDetection, fireFunnelStep, retryTrigger])

  const toggleTaskCompleted = async (taskId: string, currentCompleted: boolean) => {
    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      return
    }

    const { error: updateError } = await supabase
      .from('morning_tasks')
      .update({ completed: !currentCompleted, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (updateError) {
      if (updateError.message?.includes('completed') && updateError.message?.includes('does not exist')) {
        setError('Add the completed column first: run migration 008 in Supabase SQL Editor.')
      } else {
        setError(updateError.message)
      }
      return
    }
    setError(null)
    setMorningTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !currentCompleted } : task
      )
    )
    if (!currentCompleted) {
      setJustCompletedId(taskId)
      setTimeout(() => setJustCompletedId(null), 1500)
      const task = morningTasks.find((t) => t.id === taskId)
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'task_completion',
          action: 'complete',
          page: '/evening',
          metadata: task ? { is_needle_mover: !!(task as { needle_mover?: boolean }).needle_mover } : undefined,
        }),
      }).catch(() => {})
    }
  }

  const handleDeleteWinConfirm = async () => {
    const index = confirmDeleteWin
    if (index === null || index < 0 || index >= wins.length) return
    setConfirmDeleteWin(null)

    const newWins = wins.filter((_, i) => i !== index)
    const winsToSave = newWins.length > 0 ? newWins : ['']
    setWins(winsToSave)

    const session = await getUserSession()
    if (!session) return

    const winsFiltered = winsToSave.filter((w) => w.trim()).length > 0
      ? JSON.stringify(winsToSave.filter((w) => w.trim()))
      : null

    const { error: updateError } = await supabase
      .from('evening_reviews')
      .update({ wins: winsFiltered })
      .eq('review_date', reviewDate)
      .eq('user_id', session.user.id)

    if (updateError) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to delete win. Please try again.', type: 'error' } }))
      setWins(wins) // Revert on error
    }
  }

  const handleDeleteLessonConfirm = async () => {
    const index = confirmDeleteLesson
    if (index === null || index < 0 || index >= lessons.length) return
    setConfirmDeleteLesson(null)

    const newLessons = lessons.filter((_, i) => i !== index)
    const lessonsToSave = newLessons.length > 0 ? newLessons : ['']
    setLessons(lessonsToSave)

    const session = await getUserSession()
    if (!session) return

    const lessonsFiltered = lessonsToSave.filter((l) => l.trim()).length > 0
      ? JSON.stringify(lessonsToSave.filter((l) => l.trim()))
      : null

    const { error: updateError } = await supabase
      .from('evening_reviews')
      .update({ lessons: lessonsFiltered })
      .eq('review_date', reviewDate)
      .eq('user_id', session.user.id)

    if (updateError) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to delete lesson. Please try again.', type: 'error' } }))
      setLessons(lessons) // Revert on error
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      setSaving(false)
      router.push('/login') // Redirect if session is lost during save
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('evening_reviews')
        .delete()
        .eq('review_date', reviewDate)
        .eq('user_id', session.user.id) // Filter delete by user_id

      if (deleteError) throw deleteError

      // Filter out empty wins/lessons and store as JSON array
      const winsFiltered = wins.filter(w => w.trim()).length > 0 
        ? JSON.stringify(wins.filter(w => w.trim()))
        : null
      const lessonsFiltered = lessons.filter(l => l.trim()).length > 0
        ? JSON.stringify(lessons.filter(l => l.trim()))
        : null

      const { error: insertError } = await supabase.from('evening_reviews').insert({
        user_id: session.user.id, // Add user_id
        review_date: reviewDate,
        journal: journal.trim() || null,
        mood: mood ?? null,
        energy: energy ?? null,
        wins: winsFiltered,
        lessons: lessonsFiltered,
      })

      if (insertError) throw insertError

      fireFunnelStep(3, 'review_complete')

      trackEvent('evening_review_saved', {
        review_date: reviewDate,
        mood: mood ?? undefined,
        energy: energy ?? undefined,
        has_wins: wins.some((w) => w.trim()),
        has_lessons: lessons.some((l) => l.trim()),
        has_journal: !!journal.trim(),
      })
      // Founder analytics: enqueue pattern extraction from journal + wins + lessons
      const reflectionText = [journal.trim(), ...wins.filter((w) => w.trim()), ...lessons.filter((l) => l.trim())].filter(Boolean).join('\n')
      if (reflectionText) {
        fetch('/api/analytics/enqueue-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_table: 'evening_reviews',
            source_id: reviewDate,
            content: reflectionText,
          }),
        }).catch(() => {})
      }
      // Founder analytics: feature usage
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'evening_review',
          action: 'save',
          page: '/evening',
          metadata: { mood: mood ?? undefined, energy: energy ?? undefined },
        }),
      }).catch(() => {})

      // Trigger post-evening reflection insight AND next day's morning prompt (Pro only)
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      let insightGenerated = false
      
      if (features.dailyPostEveningPrompt) {
        setAiCoachTrigger('evening_after')
        try {
          const winsForApi = wins.filter((w) => w.trim()).length > 0 ? JSON.stringify(wins.filter((w) => w.trim())) : null
          const lessonsForApi = lessons.filter((l) => l.trim()).length > 0 ? JSON.stringify(lessons.filter((l) => l.trim())) : null
          console.log('🔵 STEP 1: Evening review saved, starting post_evening stream...')
          await startStream(
            {
              promptType: 'post_evening',
              userId: session.user.id,
              promptDate: reviewDate,
              accessToken: session?.access_token,
              postEveningOverride: {
                todayReview: {
                  wins: winsForApi,
                  lessons: lessonsForApi,
                  journal: journal.trim() || null,
                  mood: mood ?? null,
                  energy: energy ?? null,
                },
                todayPlan: morningTasks.map((t) => ({
                  description: t.description,
                  completed: t.completed,
                  needle_mover: t.needle_mover ?? false,
                })),
              },
            },
            async (fullPrompt) => {
              insightGenerated = true
              setAiCoachMessage(fullPrompt)
              const { data: existing } = await supabase
                .from('personal_prompts')
                .select('id, generation_count')
                .eq('user_id', session.user.id)
                .eq('prompt_type', 'post_evening')
                .eq('prompt_date', reviewDate)
                .maybeSingle()

              const genCount = existing ? ((existing as { generation_count?: number }).generation_count ?? 1) + 1 : 1

              const { data: saved, error: upsertErr } = await supabase
                .from('personal_prompts')
                .upsert(
                  {
                    user_id: session.user.id,
                    prompt_type: 'post_evening',
                    prompt_date: reviewDate,
                    prompt_text: fullPrompt,
                    stage_context: null,
                    generation_count: genCount,
                    generated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id,prompt_type,prompt_date' }
                )
                .select()

              if (upsertErr) {
                console.error('❌ CRITICAL - Post-evening insight save failed:', upsertErr)
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to save evening insight. Please try again.', type: 'error' } }))
              } else {
                console.log('✅ Post-evening insight SAVED, id:', (saved as { id?: string }[])?.[0]?.id)
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Evening insight saved', type: 'success' } }))
              }
            }
          )
        } catch (error) {
          console.error('🔵 STEP FAIL: Exception streaming post-evening insight:', error)
        }
        
        // Generate next day's morning prompt (invitation to plan — shown before user saves morning plan)
        try {
          const tomorrow = new Date(reviewDate)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const nextDay = format(tomorrow, 'yyyy-MM-dd')
          console.log('🔵 STEP 6: Calling morning insight API for next day:', nextDay)
          const morningRes = await fetch('/api/personal-coaching', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
            },
            body: JSON.stringify({
              promptType: 'morning',
              userId: session.user.id,
              promptDate: nextDay,
              morningOverride: {
                yesterdayReview: {
                  wins: winsFiltered,
                  lessons: lessonsFiltered,
                  journal: journal.trim() || null,
                  mood: mood ?? null,
                  energy: energy ?? null,
                },
              },
            }),
          })
          console.log('🔵 STEP 7: Morning API response status:', morningRes.status)
          const morningData = await morningRes.json().catch(() => ({}))
          console.log('🔵 STEP 8: Morning API response:', { hasPrompt: !!morningData.prompt, hasError: !!morningData.error })
          if (morningRes.ok && morningData.prompt) {
            console.log('🔵 STEP 9: Morning insight received, length:', morningData.prompt.length)

            const { data: existingMorning } = await supabase
              .from('personal_prompts')
              .select('id, generation_count')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'morning')
              .eq('prompt_date', nextDay)
              .maybeSingle()

            const morningGenCount = existingMorning ? ((existingMorning as { generation_count?: number }).generation_count ?? 1) + 1 : 1

            const { data: morningSaved, error: morningUpsertErr } = await supabase
              .from('personal_prompts')
              .upsert(
                {
                  user_id: session.user.id,
                  prompt_type: 'morning',
                  prompt_date: nextDay,
                  prompt_text: morningData.prompt,
                  stage_context: null,
                  generation_count: morningGenCount,
                  generated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,prompt_type,prompt_date' }
              )
              .select()

            if (morningUpsertErr) {
              console.error('❌ CRITICAL - Morning insight save failed:', morningUpsertErr)
              window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to save morning insight. Please try again.', type: 'error' } }))
            } else {
              console.log('✅ Morning insight SAVED for', nextDay, 'id:', (morningSaved as { id?: string }[])?.[0]?.id)
              window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Morning insight saved for tomorrow', type: 'success' } }))
            }
          } else if (morningData?.aiError) {
            console.error('🔵 STEP 9 FAIL: Morning AI error:', morningData.error, 'model:', morningData.model, 'status:', morningData.status)
          } else {
            console.error('🔵 STEP 9 FAIL: Morning prompt failed:', morningRes.status, morningData?.error || morningData)
          }
        } catch (error) {
          console.error('🔵 STEP FAIL: Exception generating morning prompt:', error)
        }
      } else {
        console.log('🔵 SKIP: dailyPostEveningPrompt not enabled for user tier:', session.user.tier)
      }

      // Check for Mrs. Deer pattern feedback after saving (new reflection may trigger pattern)
      checkPatternDetection()

      // Only trigger celebrations and streaks for today, not past dates
      if (isToday(new Date(reviewDate))) {
        // Calculate streak after saving review
        const streakData = await calculateStreak(session.user.id)
        setCurrentStreak(streakData.currentStreak)

        // Check if this is a streak milestone
        if (isStreakMilestone(streakData.currentStreak)) {
          const milestoneKey = `streak_milestone_shown_${streakData.currentStreak}_${reviewDate}`
          if (typeof window !== 'undefined' && window.localStorage.getItem(milestoneKey) !== 'true') {
            window.localStorage.setItem(milestoneKey, 'true')
            setShowStreakCelebration(true)
            return // Don't show regular celebration if showing streak celebration
          }
        }

        // Celebration: only on first successful save per day (per device)
        if (typeof window !== 'undefined') {
          const key = `evening_celebration_shown_${reviewDate}`
          const alreadyCelebrated = hasCelebratedToday || window.localStorage.getItem(key) === 'true'
          if (!alreadyCelebrated) {
            window.localStorage.setItem(key, 'true')
            setHasCelebratedToday(true)
            setShowCelebration(true)
            return // Celebration will show, insight will appear after
          }
        }

        // If we've already celebrated today AND insight was generated, stay on page to show insight
        // Only redirect if no insight was generated
        if (!insightGenerated) {
          console.log('⚠️ No insight generated, redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.log('✅ Insight generated, staying on page to display it')
          setError(null)
        }
      } else {
        // For past dates, just clear error (insight already shown above)
        setError(null)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-5 py-8">
        <LoadingWithRetry
          message="Reflecting on your day..."
          onRetry={() => setRetryTrigger((t) => t + 1)}
          timeoutMs={8000}
        />
      </div>
    )
  }

  return (
    <div 
      className="max-w-3xl mx-auto px-4 md:px-5 py-8 transition-all duration-200"
      style={{ paddingTop: spacing['3xl'], paddingBottom: spacing['2xl'] }}
    >
      {/* Header with Mrs. Deer - responsive: avatar above on mobile, left on desktop */}
      <div className="mb-8" style={{ marginBottom: spacing['2xl'] }}>
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
          <div className="flex justify-center md:justify-start">
            <MrsDeerAvatar expression="empathetic" size="mobile" className="md:hidden" />
            <MrsDeerAvatar expression="empathetic" size="large" className="hidden md:block" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 
              className="font-bold mb-2 text-[#152B50] dark:text-white"
              style={{ 
                fontSize: typography.pageTitle.fontSize, 
                fontWeight: typography.pageTitle.fontWeight,
                lineHeight: typography.pageTitle.lineHeight,
              }}
            >
              Evening Review
            </h1>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              {isToday(new Date(reviewDate)) ? format(new Date(reviewDate), 'EEEE, MMMM d, yyyy') : `Review for ${format(new Date(reviewDate), 'MMMM d, yyyy')}`}
            </p>
          </div>
        </div>
        <DateSelector selectedDate={reviewDate} onDateChange={setReviewDate} maxDaysBack={30} className="mb-6" />
      </div>

      {/* Today's Journey: What You Accomplished */}
      <Card highlighted className="mb-8" style={{ marginBottom: spacing['2xl'], borderLeft: `3px solid ${colors.emerald.DEFAULT}` }}>
        <CardHeader style={{ padding: spacing['xl'] }}>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Mountain className="w-5 h-5" style={{ color: colors.emerald.DEFAULT }} />
            {isToday(new Date(reviewDate)) ? lang.eveningTitle : `Journey for ${format(new Date(reviewDate), 'MMMM d')}: ${lang.eveningTitle.split(': ')[1] || 'What You Accomplished'}`}
          </CardTitle>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
            Celebrate what you moved forward today—every step counts.
          </p>
        </CardHeader>
        <CardContent style={{ padding: spacing['xl'] }}>

        {morningTasks.length === 0 ? (
          <p className="text-sm italic text-gray-600 dark:text-gray-300">
            No priorities planned for today. That&apos;s okay—you showed up and that matters.
          </p>
        ) : (
          <ul className="space-y-4">
            {morningTasks.map((task, index) => (
                <motion.li
                  key={task.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-start gap-4 rounded-xl p-4 transition-all duration-300 ${
                    justCompletedId === task.id ? 'animate-pulse' : ''
                  } ${task.completed ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}
                >
                  <motion.button
                    type="button"
                    onClick={() => toggleTaskCompleted(task.id, task.completed)}
                    className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: task.completed ? colors.emerald.DEFAULT : 'transparent',
                      borderWidth: task.completed ? '0' : '2px',
                      borderColor: colors.neutral.border,
                      color: task.completed ? '#FFFFFF' : 'transparent',
                    }}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.1 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                    aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {task.completed && (
                      <motion.div
                        initial={prefersReducedMotion ? false : { scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </motion.div>
                    )}
                  </motion.button>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-lg ${task.completed ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}
                  >
                    {task.description}
                  </span>
                  {task.completed && (
                    <p className="mt-1 text-sm font-medium" style={{ color: colors.emerald.DEFAULT }}>
                      ✓ Priority completed with intention
                    </p>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>

      {/* Emotional Check-in */}
      <Card highlighted className="mb-8" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Heart className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            How You&apos;re Feeling
          </CardTitle>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
            A gentle check-in—no judgment, just awareness.
          </p>
        </CardHeader>
        <CardContent>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-4 text-gray-900 dark:text-white">
              Mood (How are you feeling?)
            </label>
            <div className="flex flex-wrap gap-3">
              {MOOD_OPTIONS.map((opt) => {
                const isSelected = mood === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      fireFunnelStep(2, 'journal_engaged')
                      setMood(opt.value)
                    }}
                    className={`min-h-[48px] px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${isSelected ? 'text-[#EF725C] bg-[#FFF0EC] dark:bg-[#2D1F1C]' : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700'} border-2`}
                    style={{
                      borderColor: isSelected ? colors.coral.DEFAULT : 'transparent',
                    }}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    {opt.label}
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-4 text-gray-900 dark:text-white">
              Energy (How&apos;s your energy?)
            </label>
            <div className="flex flex-wrap gap-3">
              {ENERGY_OPTIONS.map((opt) => {
                const isSelected = energy === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      fireFunnelStep(2, 'journal_engaged')
                      setEnergy(opt.value)
                    }}
                    className={`min-h-[48px] px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all border-2 ${isSelected ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700'}`}
                    style={{
                      borderColor: isSelected ? colors.amber.DEFAULT : 'transparent',
                    }}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    {opt.label}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Journal */}
      <Card className="mb-8 bg-gray-50 dark:bg-gray-800" style={{ marginBottom: spacing['2xl'], borderLeft: `4px solid ${colors.navy.DEFAULT}` }}>
        <CardHeader style={{ padding: spacing['xl'] }}>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Lightbulb className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
            Today&apos;s Reflection
          </CardTitle>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
            What matters most from today? What would you carry forward?
          </p>
        </CardHeader>
        <CardContent style={{ padding: spacing['xl'] }}>
        <SpeechToTextInput
          as="textarea"
          value={journal}
          onChange={(e) => {
            fireFunnelStep(2, 'journal_engaged')
            setJournal(e.target.value)
          }}
          placeholder="How did today go? What stood out? What would you do differently?"
          rows={5}
          className="w-full px-6 py-4 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          style={{
            borderColor: colors.neutral.border,
            fontSize: '16px',
            lineHeight: '1.6',
          }}
        />
        </CardContent>
      </Card>

      {/* Wins & Lessons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" style={{ marginBottom: spacing['2xl'] }}>
        {/* Wins Card */}
        <Card className="mb-0" style={{ borderLeft: `4px solid ${colors.emerald.DEFAULT}` }}>
          <CardHeader style={{ padding: spacing['xl'] }}>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Award className="w-5 h-5" style={{ color: colors.emerald.DEFAULT }} />
              Wins
            </CardTitle>
            <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
              Celebrate what worked today
            </p>
          </CardHeader>
          <CardContent style={{ padding: spacing['xl'] }}>
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              What went well?
            </label>
            <div className="space-y-3">
              {wins.map((win, index) => (
                <div key={index} className="flex gap-2">
                  <SpeechToTextInput
                    as="textarea"
                    value={win}
                    onChange={(e) => {
                      fireFunnelStep(2, 'journal_engaged')
                      const newWins = [...wins]
                      newWins[index] = e.target.value
                      fireFunnelStep(2, 'journal_engaged')
                      setWins(newWins)
                    }}
                    placeholder="Celebrate your wins—big or small..."
                    rows={2}
                    className="flex-1 px-4 py-2 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    style={{
                      borderColor: colors.neutral.border,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWin(index)}
                    className="p-2 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500 flex-shrink-0"
                    aria-label="Delete win"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setWins([...wins, ''])}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: colors.navy.DEFAULT }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.coral.DEFAULT}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.navy.DEFAULT}
              >
                <Plus className="w-4 h-4" />
                Add more wins
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Lessons Card */}
        <Card className="mb-0" style={{ borderLeft: `4px solid ${colors.amber.DEFAULT}` }}>
          <CardHeader style={{ padding: spacing['xl'] }}>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Lightbulb className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
              Lessons
            </CardTitle>
            <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
              What you&apos;d carry forward
            </p>
          </CardHeader>
          <CardContent style={{ padding: spacing['xl'] }}>
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              What would you do differently?
            </label>
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <div key={index} className="flex gap-2">
                  <SpeechToTextInput
                    as="textarea"
                    value={lesson}
                    onChange={(e) => {
                      fireFunnelStep(2, 'journal_engaged')
                      const newLessons = [...lessons]
                      newLessons[index] = e.target.value
                      fireFunnelStep(2, 'journal_engaged')
                      setLessons(newLessons)
                    }}
                    placeholder="Gentle lessons to carry forward..."
                    rows={2}
                    className="flex-1 px-4 py-2 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    style={{
                      borderColor: colors.neutral.border,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLesson(index)}
                    className="p-2 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500 flex-shrink-0"
                    aria-label="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLessons([...lessons, ''])}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: colors.navy.DEFAULT }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.coral.DEFAULT}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.navy.DEFAULT}
              >
                <Plus className="w-4 h-4" />
                Add more lessons
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg flex items-center gap-2 transition-all duration-200" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: '1px', color: '#B91C1C' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={saving}
        isLoading={saving}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {saving ? 'Completing...' : 'Complete my day'}
      </Button>

      {/* Loading: Mrs. Deer reflecting after save */}
      {saving && (
        <div className="mt-4 p-4 rounded-lg border-2 flex items-center gap-3 mb-6 bg-amber-50 dark:bg-amber-950/30 border-amber-500 dark:border-amber-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-700 dark:border-amber-400 flex-shrink-0" />
          <p className="text-amber-800 dark:text-amber-200 font-medium">Mrs. Deer, your AI companion is reflecting on your input...</p>
        </div>
      )}

      {/* Mrs. Deer AI Coach - Evening Reflection Insight (permanent, always shown if exists) */}
      {aiCoachTrigger === 'evening_after' && (aiCoachMessage || isStreaming || streamingError) && (
        <>
          {isStreaming && <StreamingIndicator className="mb-4" />}
          <AICoachPrompt
            message={isStreaming ? (streamingInsight || '...') : (streamingError ? `[AI ERROR] ${streamingError}` : aiCoachMessage!)}
            trigger={aiCoachTrigger}
            onClose={() => {
              // Insights are permanent - don't actually close them
            }}
          />
        </>
      )}

      {/* Mrs. Deer adaptive prompt - behavior or coaching pattern (no feedback form) */}
      {detectedPattern && (
        <MrsDeerAdaptivePrompt
          pattern={detectedPattern}
          onDismiss={() => setDetectedPattern(null)}
          onRecordShown={async (patternType) => {
            await fetch('/api/feedback/record-pattern-shown', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patternType }),
            })
          }}
        />
      )}

      {/* Delete Win Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteWin !== null}
        title="Delete win?"
        message="Are you sure you want to delete this win?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteWinConfirm}
        onCancel={() => setConfirmDeleteWin(null)}
      />

      {/* Delete Lesson Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteLesson !== null}
        title="Delete lesson?"
        message="Are you sure you want to delete this lesson?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteLessonConfirm}
        onCancel={() => setConfirmDeleteLesson(null)}
      />

      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => {
          setShowCelebration(false)
        }}
        tasksCompleted={morningTasks.filter((t) => t.completed).length}
        totalTasks={morningTasks.length}
      />

      <StreakCelebrationModal
        isOpen={showStreakCelebration}
        onClose={() => {
          setShowStreakCelebration(false)
        }}
        streak={currentStreak}
      />
    </div>
  )
}
