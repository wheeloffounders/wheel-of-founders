'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, isToday } from 'date-fns'
import { Moon, Heart, Award, Lightbulb, AlertCircle, Check, Mountain, Plus, X } from 'lucide-react'
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

const MOOD_OPTIONS = [
  { value: 1, label: 'Tough', emoji: '😞' },
  { value: 2, label: 'Meh', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😊' },
]

const ENERGY_OPTIONS = [
  { value: 1, label: 'Drained' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Energized' },
  { value: 5, label: 'Peak' },
]

interface Task {
  id: string
  description: string
  completed: boolean
}

export default function EveningPage() {
  const router = useRouter()
  const lang = useUserLanguage() // Personalized language
  const [userTier, setUserTier] = useState<string>('beta')
  const [aiCoachMessage, setAiCoachMessage] = useState<string | null>(null)
  const [aiCoachTrigger, setAiCoachTrigger] = useState<'evening_after' | null>(null)
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
  const [reviewDate, setReviewDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const funnelStepRef = useRef<Set<number>>(new Set())

  const fireFunnelStep = useCallback((step: number, name: string) => {
    if (funnelStepRef.current.has(step)) return
    funnelStepRef.current.add(step)
    trackFunnelStep('evening_flow', name, step)
  }, [])
  const [detectedPattern, setDetectedPattern] = useState<{
    kind: 'behavior' | 'coaching'
    patternType: string
    message: string
    suggestedAction: string
    ctaLabel?: string
    context?: string
  } | null>(null)

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

  // Check if celebration has already been shown for today (per-device)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = `evening_celebration_shown_${reviewDate}`
    const value = window.localStorage.getItem(key)
    if (value === 'true') {
      setHasCelebratedToday(true)
    }
  }, [reviewDate])

  useEffect(() => {
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
                .select('prompt_text, prompt_type, prompt_date, generated_at')
                .eq('user_id', session.user.id)
                .eq('prompt_type', 'post_evening')
                .eq('prompt_date', reviewDate) // EXACT date match - no date range fallback
                .order('generated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              
              if (error) {
                console.error(`[Evening Page Load] Error loading post_evening insight for ${reviewDate}:`, error)
              } else if (data) {
                console.log(`[Evening Page Load] Evening insight found for ${reviewDate}:`, data.prompt_text?.substring(0, 50))
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
          }))
        )
      } else {
        setMorningTasks([])
      }

      setLoading(false)
    }

    fetchTodayReviewAndTasks()
  }, [reviewDate])

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
        try {
          console.log('🟡 Generating post-evening insight...')
          const res = await fetch('/api/personal-coaching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptType: 'post_evening', userId: session.user.id, promptDate: reviewDate }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.prompt) {
              console.log('✅ Post-evening insight generated')
              setAiCoachMessage(data.prompt)
              setAiCoachTrigger('evening_after')
              insightGenerated = true
            }
          } else {
            const errorData = await res.json().catch(() => ({}))
            console.error('❌ API error:', res.status, errorData)
          }
        } catch (error) {
          console.error('❌ Failed to load post-evening AI prompt:', error)
        }
        
        // Generate next day's morning prompt (invitation to plan — shown before user saves morning plan)
        try {
          const tomorrow = new Date(reviewDate)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const nextDay = format(tomorrow, 'yyyy-MM-dd')
          console.log('[EVENING SAVE] Calling generateProPlusPrompt:', { type: 'morning', date: nextDay, reviewDate })
          const morningRes = await fetch('/api/personal-coaching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptType: 'morning', userId: session.user.id, promptDate: nextDay }),
          })
          const morningData = await morningRes.json().catch(() => ({}))
          if (morningRes.ok && morningData.prompt) {
            console.log('[EVENING SAVE] ✅ Next day morning prompt generated for', nextDay, '(length:', morningData.prompt?.length, 'chars)')
          } else {
            console.error('[EVENING SAVE] ❌ Morning prompt failed:', morningRes.status, morningData?.error || morningData)
          }
        } catch (error) {
          console.error('[EVENING SAVE] ❌ Failed to generate next day morning prompt:', error)
        }
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
          router.push('/')
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#152b50] dark:text-[#E2E8F0] mb-2 flex items-center gap-2">
        <Moon className="w-8 h-8 text-[#152b50]" />
        Evening Review
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {isToday(new Date(reviewDate)) ? format(new Date(reviewDate), 'EEEE, MMMM d, yyyy') : `Review for ${format(new Date(reviewDate), 'MMMM d, yyyy')}`}
      </p>
      <DateSelector selectedDate={reviewDate} onDateChange={setReviewDate} maxDaysBack={30} className="mb-6" />

      {/* Today's Journey: What You Accomplished */}
      <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#22c55e] dark:border-[#22c55e]/70">
        <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-2 flex items-center gap-2">
          <Mountain className="w-5 h-5 text-[#22c55e]" />
          {isToday(new Date(reviewDate)) ? lang.eveningTitle : `Journey for ${format(new Date(reviewDate), 'MMMM d')}: ${lang.eveningTitle.split(': ')[1] || 'What You Accomplished'}`}
        </h2>
        <p className="text-gray-500 dark:text-gray-300 text-sm mb-4">
          Celebrate what you moved forward today—every step counts.
        </p>

        {morningTasks.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            No priorities planned for today. That&apos;s okay—you showed up and that matters.
          </p>
        ) : (
          <ul className="space-y-4">
            {morningTasks.map((task) => (
              <li
                key={task.id}
                className={`flex items-start gap-4 rounded-xl p-4 transition-all duration-300 ${
                  task.completed
                    ? 'bg-emerald-50/60 opacity-90'
                    : 'bg-gray-50/50 hover:bg-gray-50'
                } ${justCompletedId === task.id ? 'animate-pulse' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleTaskCompleted(task.id, task.completed)}
                  className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    task.completed
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'border-2 border-gray-300 text-transparent hover:border-[#152b50]'
                  }`}
                  aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.completed && <Check className="w-4 h-4 stroke-[2.5]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-lg ${
                      task.completed
                        ? 'text-emerald-800/90'
                        : 'text-gray-900 dark:text-[#E2E8F0]'
                    }`}
                  >
                    {task.description}
                  </span>
                  {task.completed && (
                    <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-300 font-medium">
                      ✓ Priority completed with intention
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Emotional Check-in */}
      <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#ef725c] dark:border-[#ef725c]/70">
        <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-2 flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#ef725c]" />
          How You&apos;re Feeling
        </h2>
        <p className="text-gray-500 dark:text-gray-300 text-sm mb-4">
          A gentle check-in—no judgment, just awareness.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How was your mood today?
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    fireFunnelStep(2, 'journal_engaged')
                    fireFunnelStep(2, 'journal_engaged')
                    setMood(opt.value)
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    mood === opt.value
                      ? 'bg-[#ef725c] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Energy level now?
            </label>
            <div className="flex flex-wrap gap-2">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    fireFunnelStep(2, 'journal_engaged')
                    fireFunnelStep(2, 'journal_engaged')
                    setEnergy(opt.value)
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    energy === opt.value
                      ? 'bg-[#152b50] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Journal */}
      <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#152b50] dark:border-[#152b50]/70">
        <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-2 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#152b50]" />
          Today&apos;s Reflection
        </h2>
        <p className="text-gray-500 dark:text-gray-300 text-sm mb-4">
          What matters most from today? What would you carry forward?
        </p>

        <SpeechToTextInput
          as="textarea"
          value={journal}
          onChange={(e) => {
            fireFunnelStep(2, 'journal_engaged')
            fireFunnelStep(2, 'journal_engaged')
            setJournal(e.target.value)
          }}
          placeholder="How did today go? What stood out? What would you do differently?"
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
        />
      </section>

      {/* Wins & Lessons */}
      <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#152b50] dark:border-[#152b50]/70">
        <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-2 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#ef725c]" />
          Wins & Lessons
        </h2>
        <p className="text-gray-500 dark:text-gray-300 text-sm mb-4">
          Celebrate what worked. Honor what you&apos;d carry forward.
        </p>

        <div className="space-y-6">
          {/* Wins Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
                  />
                  {wins.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newWins = wins.filter((_, i) => i !== index)
                        setWins(newWins.length > 0 ? newWins : [''])
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove win"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setWins([...wins, ''])}
                className="flex items-center gap-2 text-sm text-[#152b50] dark:text-[#E2E8F0] hover:text-[#ef725c] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add more wins
              </button>
            </div>
          </div>

          {/* Lessons Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
                  />
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newLessons = lessons.filter((_, i) => i !== index)
                        setLessons(newLessons.length > 0 ? newLessons : [''])
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove lesson"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLessons([...lessons, ''])}
                className="flex items-center gap-2 text-sm text-[#152b50] dark:text-[#E2E8F0] hover:text-[#ef725c] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add more lessons
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/60 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 px-6 bg-[#152b50] text-white text-lg font-semibold rounded-xl hover:bg-[#1a3565] disabled:opacity-70 disabled:cursor-not-allowed transition"
      >
        {saving ? 'Completing...' : 'Complete my day'}
      </button>

      {/* Mrs. Deer AI Coach - Evening Reflection Insight (permanent, always shown if exists) */}
      {aiCoachMessage && aiCoachTrigger && (
        <AICoachPrompt
          message={aiCoachMessage}
          trigger={aiCoachTrigger}
          onClose={() => {
            // Insights are permanent - don't actually close them
            // This handler is kept for component compatibility but does nothing
          }}
        />
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
