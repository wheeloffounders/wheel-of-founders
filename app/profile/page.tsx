
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles, Check, Edit2, Settings, Clock, MessageSquare } from 'lucide-react'
import { founderStruggles } from '@/lib/founder-struggles'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getUserGoal, getUserLanguage, UserGoal } from '@/lib/user-language'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'
import { isDevelopment, isPreview } from '@/lib/env'

const HOBBY_OPTIONS = [
  { value: 'sports_fitness', label: 'Sports / fitness', emoji: '🏃' },
  { value: 'reading', label: 'Reading', emoji: '📚' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'music', label: 'Music / playing instruments', emoji: '🎵' },
  { value: 'art_design', label: 'Art / design / creative', emoji: '🎨' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'cooking', label: 'Cooking / food', emoji: '🍳' },
  { value: 'nature', label: 'Nature / hiking', emoji: '🌳' },
  { value: 'meditation', label: 'Meditation / mindfulness', emoji: '🧘' },
  { value: 'movies_tv', label: 'Movies / TV', emoji: '📺' },
  { value: 'social', label: 'Social / time with friends', emoji: '👥' },
  { value: 'animals', label: 'Animals / pets', emoji: '🐶' },
  { value: 'diy', label: 'DIY / building things', emoji: '🛠️' },
]

const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea', emoji: '💡' },
  { value: 'mvp', label: 'MVP', emoji: '🛠️' },
  { value: 'launched', label: 'Launched', emoji: '🚀' },
  { value: 'growing', label: 'Growing', emoji: '📈' },
  { value: 'scaling', label: 'Scaling', emoji: '⚡' },
  { value: 'pivoting', label: 'Pivoting', emoji: '🔁' },
  { value: 'other', label: 'Other', emoji: '📝' },
]

const ROLE_OPTIONS = [
  { value: 'solo', label: 'Solo', emoji: '👤' },
  { value: 'technical', label: 'Technical', emoji: '💻' },
  { value: 'business', label: 'Business', emoji: '📊' },
  { value: 'designer', label: 'Designer', emoji: '🎨' },
  { value: 'hybrid', label: 'Hybrid', emoji: '🤝' },
  { value: 'other', label: 'Other', emoji: '📝' },
]

const HOURS_OPTIONS = [
  { value: '<20', label: '<20 hours', emoji: '⏳' },
  { value: '20-40', label: '20-40 hours', emoji: '⚖️' },
  { value: '40-60', label: '40-60 hours', emoji: '🔥' },
  { value: '60+', label: '60+ hours', emoji: '💥' },
]


const YEARS_OPTIONS = [
  { value: '<1', label: '<1 year', emoji: '🌱' },
  { value: '1-3', label: '1-3 years', emoji: '🌿' },
  { value: '3-5', label: '3-5 years', emoji: '🌳' },
  { value: '5+', label: '5+ years', emoji: '🌲' },
]

const PERSONALITY_OPTIONS = [
  { value: 'visionary', label: 'Visionary', emoji: '🦅' },
  { value: 'hustler', label: 'Hustler', emoji: '🦊' },
  { value: 'builder', label: 'Builder', emoji: '🐻' },
  { value: 'strategist', label: 'Strategist', emoji: '🦉' },
  { value: 'pack_leader', label: 'Pack Leader', emoji: '🐺' },
  { value: 'other', label: 'Other', emoji: '📝' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDevTools, setShowDevTools] = useState(false)
  const [undoReset, setUndoReset] = useState<{ backupId: string; expiresAt: string } | null>(null)
  const [undoInFlight, setUndoInFlight] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [devResetLoading, setDevResetLoading] = useState<'idle' | 'onboarding' | 'full'>('idle')

  // Determine if dev tools should be visible (dev, preview, or ?dev=true)
  let shouldShowDevTools = isDevelopment || isPreview
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const forceDev = params.get('dev') === 'true'
    if (forceDev) {
      shouldShowDevTools = true
    }
  }

  if (typeof window !== 'undefined') {
    // Temporary debug log
    // eslint-disable-next-line no-console
    console.log('[Profile Debug] isDevelopment:', isDevelopment, 'isPreview:', isPreview, 'shouldShowDevTools:', shouldShowDevTools)
  }
  
  // Profile data
  const [name, setName] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [primaryGoal, setPrimaryGoal] = useState<UserGoal | null>(null)
  const [primaryGoalText, setPrimaryGoalText] = useState('')
  const [destressActivity, setDestressActivity] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [hobbiesOther, setHobbiesOther] = useState('')
  const [messageToMrsDeer, setMessageToMrsDeer] = useState('')
  const [founderStage, setFounderStage] = useState('')
  const [founderStageOther, setFounderStageOther] = useState('')
  const [primaryRole, setPrimaryRole] = useState('')
  const [primaryRoleOther, setPrimaryRoleOther] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('')
  const [struggles, setStruggles] = useState<string[]>([])
  const [strugglesOther, setStrugglesOther] = useState('')
  const [yearsAsFounder, setYearsAsFounder] = useState('')
  const [founderPersonality, setFounderPersonality] = useState('')
  const [founderPersonalityOther, setFounderPersonalityOther] = useState('')
  const [emailDigest, setEmailDigest] = useState(true)
  const [notificationFrequency, setNotificationFrequency] = useState('daily')
  const [profileInsight, setProfileInsight] = useState<string | null>(null)
  const [generatingInsight, setGeneratingInsight] = useState(false)
  const [session, setSession] = useState<Awaited<ReturnType<typeof getUserSession>> | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      const sess = await getUserSession()
      if (!sess?.user?.id) {
        router.push('/auth/login')
        setLoading(false)
        return
      }
      setSession(sess)

      let profileData: Record<string, unknown> | null = null
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', sess.user.id)
          .maybeSingle()

        if (error) {
          console.error('Failed to load profile:', error)
          setLoading(false)
          return
        }

        if (data) {
          profileData = data as Record<string, unknown>
          setName((data.name as string) || '')
          setPreferredName((data.preferred_name as string) || '')
          setCompanyName((data.company_name as string) || '')
          setPrimaryGoal(data.primary_goal as UserGoal | null)
          setPrimaryGoalText((data.primary_goal_text as string) || '')
          setDestressActivity((data.destress_activity as string) || '')
          setHobbies(Array.isArray(data.hobbies) ? data.hobbies : [])
          setHobbiesOther((data.hobbies_other as string) || '')
          setMessageToMrsDeer((data.message_to_mrs_deer as string) || '')
          setFounderStage((data.founder_stage as string) || '')
          setFounderStageOther((data.founder_stage_other as string) || '')
          setPrimaryRole((data.primary_role as string) || '')
          setPrimaryRoleOther((data.primary_role_other as string) || '')
          setWeeklyHours((data.weekly_hours as string) || '')
          setStruggles(Array.isArray(data.struggles) ? data.struggles : [])
          setStrugglesOther((data.struggles_other as string) || '')
          setYearsAsFounder((data.years_as_founder as string) || '')
          setFounderPersonality((data.founder_personality as string) || '')
          setFounderPersonalityOther((data.founder_personality_other as string) || '')
          setEmailDigest((data.email_digest as boolean) ?? true)
          setNotificationFrequency((data.notification_frequency as string) || 'daily')
        }

        // Load current goal from user_profiles or user_goals
        const goal = await getUserGoal(sess.user.id)
        if (goal) setPrimaryGoal(goal)

        // Load existing profile insight from personal_prompts
        const { data: insightData } = await supabase
          .from('personal_prompts')
          .select('prompt_text')
          .eq('user_id', sess.user.id)
          .eq('prompt_type', 'profile')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (insightData?.prompt_text) {
          setProfileInsight(insightData.prompt_text)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
        if (profileData) {
          const d = profileData
          const completion = [
            d.name, d.primary_goal_text, d.destress_activity,
            (Array.isArray(d.hobbies) ? d.hobbies.length : 0) > 0, d.message_to_mrs_deer,
            d.founder_stage, d.primary_role, d.weekly_hours,
            (Array.isArray(d.struggles) ? d.struggles.length : 0) > 0, d.years_as_founder, d.founder_personality,
          ].filter(Boolean).length
          trackEvent('profile_page_view', { completion_percentage: Math.round((completion / 11) * 100) })
        } else {
          trackEvent('profile_page_view', { completion_percentage: 0 })
        }
      }
    }

    loadProfile()
  }, [router])

  const completedCount = [
    name,
    primaryGoalText,
    destressActivity,
    hobbies.length > 0,
    messageToMrsDeer,
    founderStage,
    primaryRole,
    weeklyHours,
    struggles.length > 0,
    yearsAsFounder,
    founderPersonality,
  ].filter(Boolean).length

  // Update progress text (now 11 fields total, including name)
  const progressText = `${completedCount} of 11 completed`

  const handleSave = async () => {
    console.log('🟡 Starting profile save...')
    setSaving(true)
    setMessage(null)

    // Validate required fields
    if (!name || !name.trim()) {
      setMessage({ type: 'error', text: 'Please enter your name' })
      setSaving(false)
      return
    }

    const session = await getUserSession()
    if (!session) {
      console.error('❌ No session found while saving profile')
      setMessage({ type: 'error', text: 'You need to be logged in to save your profile.' })
      setSaving(false)
      return
    }

    try {   
      if (!session?.user?.id) {
        throw new Error('No session found')
      }

      console.log('🟡 Saving profile to Supabase...', {
        userId: session.user.id,
        name,
        preferredName,
        companyName,
      })

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: session.user.id,
            name: name,
            preferred_name: preferredName || null,
            company_name: companyName || null,
            primary_goal_text: primaryGoalText,
            destress_activity: destressActivity,
            hobbies: hobbies,
            hobbies_other: hobbiesOther,
            message_to_mrs_deer: messageToMrsDeer,
            founder_stage: founderStage,
            founder_stage_other: founderStageOther,
            primary_role: primaryRole,
            primary_role_other: primaryRoleOther,
            weekly_hours: weeklyHours,
            struggles: struggles,
            struggles_other: strugglesOther,
            years_as_founder: yearsAsFounder,
            founder_personality: founderPersonality,
            founder_personality_other: founderPersonalityOther,
            email_digest: emailDigest,
            notification_frequency: notificationFrequency,
            profile_completed_at: completedCount >= 6 ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()

      if (error) throw error

      console.log('✅ Profile saved to Supabase', data)

      // Verify the data was actually saved before calling the API
      // Retry mechanism to handle timing issues
      let retries = 3
      let profileVerified = false
      
      while (retries > 0 && !profileVerified) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: verifyData, error: verifyError } = await supabase
          .from('user_profiles')
          .select('name, preferred_name, primary_goal_text, hobbies')
          .eq('id', session.user.id)
          .maybeSingle()
        
        if (verifyError) {
          console.warn(`⚠️ Verification attempt failed (${retries} retries left):`, verifyError)
        } else if (verifyData && (verifyData.name || verifyData.preferred_name)) {
          console.log('✅ Profile data verified in database:', {
            name: verifyData.name,
            preferred_name: verifyData.preferred_name,
            hasGoalText: !!verifyData.primary_goal_text,
            hasHobbies: !!verifyData.hobbies?.length,
          })
          profileVerified = true
        } else {
          console.warn(`⚠️ Profile data not yet available (${retries} retries left)`)
        }
        
        retries--
      }
      
      if (!profileVerified) {
        console.warn('⚠️ Could not verify profile data was saved, but proceeding with API call anyway')
      }

      setMessage({ type: 'success', text: 'Profile saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
      trackEvent('profile_updated', { completion_count: completedCount })
      
      // Generate profile insight after saving
      console.log('🟡 Calling profile insight API from profile page...')
      await generateProfileInsight()
      console.log('✅ Profile insight API call completed')
    } catch (error) {
      console.error('❌ Error saving profile:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save profile',
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleHobby = (value: string) => {
    setHobbies((prev) =>
      prev.includes(value) ? prev.filter((h) => h !== value) : [...prev, value]
    )
  }

  const toggleStruggle = (id: string) => {
    setStruggles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const lang = getUserLanguage(primaryGoal)

  const generateProfileInsight = async () => {
    setGeneratingInsight(true)
    try {
      const session = await getUserSession()
      if (!session) {
        console.error('❌ No session found when generating profile insight')
        return
      }

      console.log('🟡 Sending request to /api/profile-insight...', { userId: session.user.id })

      const response = await fetch('/api/profile-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies so API route can read session
        body: JSON.stringify({
          userId: session.user.id,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.error('❌ Profile insight API failed:', response.status, data)
        const msg = data.aiError
          ? `[AI ERROR] ${data.error}${data.model ? ` (model: ${data.model})` : ''}${data.status ? ` [status ${data.status}]` : ''}`
          : `Error: ${data.error || 'Failed to generate insight'}`
        setProfileInsight(msg)
        return
      }
      if (data.insight) {
        console.log('✅ Received profile insight from API')
        setProfileInsight(data.insight)
      }
    } catch (error) {
      console.error('❌ Failed to generate profile insight:', error)
    } finally {
      setGeneratingInsight(false)
    }
  }

  const handleUndoReset = async () => {
    if (!undoReset?.backupId || undoInFlight) return
    setUndoInFlight(true)
    try {
      const { data: authData } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (authData.session?.access_token) {
        headers.Authorization = `Bearer ${authData.session.access_token}`
      }
      const res = await fetch('/api/user/undo-reset', {
        method: 'POST',
        headers,
        body: JSON.stringify({ backupId: undoReset.backupId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: typeof data?.error === 'string' ? data.error : 'Failed to undo reset.',
        })
        return
      }
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
        undoTimerRef.current = null
      }
      setUndoReset(null)
      setMessage({ type: 'success', text: 'Reset undone. Your data has been restored.' })
    } catch (error) {
      console.error('[DevTools] Failed to undo reset:', error)
      setMessage({ type: 'error', text: 'Failed to undo reset. Check console for details.' })
    } finally {
      setUndoInFlight(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: '#ef725c' }}
            aria-hidden
          />
          <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-white flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#ef725c]" />
          Your Founder Profile
        </h1>
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mt-2">
          Mrs. Deer, your AI companion gets to know you better
        </p>
        {primaryGoal && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Current goal:</span>
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-medium">
              {lang.dashboardTitle}
            </span>
            <Link
              href="/settings"
              className="text-sm text-[#ef725c] hover:underline flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Change
            </Link>
          </div>
        )}
        <div className="mt-2">
          <Link
            href="/feedback"
            className="text-sm text-[#ef725c] hover:underline flex items-center gap-1 inline-flex"
          >
            <MessageSquare className="w-3 h-3" />
            Give Feedback
          </Link>
        </div>
      </div>

      {/* Mrs. Deer, your AI companion Profile Insight (permanent, always shown if exists) */}
      {profileInsight && (
        <AICoachPrompt
          message={profileInsight}
          trigger="profile"
          onClose={() => {
            // Insights are permanent - don't actually close them
            // This handler is kept for component compatibility but does nothing
          }}
        />
      )}

      {generatingInsight && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border border-amber-200 dark:border-amber-500/40">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-300 animate-pulse" />
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Mrs. Deer, your AI companion is reflecting on your profile...
            </p>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-6">
          Basic Info
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Your name <span className="text-[#ef725c]">*</span>
            </label>
            <SpeechToTextInput
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alex Chen"
              required
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
              This is how Mrs. Deer, your AI companion will greet you
            </p>
          </div>
          
          <div>
            <label htmlFor="preferred_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              What should I call you? (optional)
            </label>
            <SpeechToTextInput
              type="text"
              id="preferred_name"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="e.g., Alex, Al, or leave blank to use your name"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
              A nickname or preferred name Mrs. Deer, your AI companion can use instead
            </p>
          </div>
          
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Company name (optional)
            </label>
            <SpeechToTextInput
              type="text"
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Studios"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Your Founder Story */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
            Your Founder Story
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="primary-goal-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              In two sentences, what's your primary goal right now?
            </label>
            <SpeechToTextInput
              as="textarea"
              id="primary-goal-text"
              value={primaryGoalText}
              onChange={(e) => setPrimaryGoalText(e.target.value)}
              placeholder="I'm building a SaaS for creators and trying to figure out pricing..."
              maxLength={280}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent resize-none text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">{primaryGoalText.length}/280 characters</p>
          </div>

          <div>
            <label htmlFor="destress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              What do you do to decompress or destress?
            </label>
            <SpeechToTextInput
              as="textarea"
              id="destress"
              value={destressActivity}
              onChange={(e) => setDestressActivity(e.target.value)}
              placeholder="I run, play guitar, or cook something complicated..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent resize-none text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* A Little About You */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
              A Little About You
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 mt-1">
              Helps Mrs. Deer, your AI companion understand you as a whole person, not just a founder.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
            What are your hobbies or interests outside of work? (check all that apply)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {HOBBY_OPTIONS.map((hobby) => (
              <button
                key={hobby.value}
                type="button"
                onClick={() => toggleHobby(hobby.value)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  hobbies.includes(hobby.value)
                    ? 'border-[#ef725c] bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{hobby.emoji}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-white">
                    {hobby.label}
                  </span>
                  {hobbies.includes(hobby.value) && (
                    <Check className="w-4 h-4 text-[#ef725c] ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label htmlFor="hobbies-other" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Something else? Tell us:
            </label>
            <SpeechToTextInput
              id="hobbies-other"
              type="text"
              value={hobbiesOther}
              onChange={(e) => setHobbiesOther(e.target.value)}
              placeholder="e.g., Photography, Chess, Surfing..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
          </div>
          
          {/* Message to Mrs. Deer, your AI companion */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <label htmlFor="message-mrs-deer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Is there anything else you'd like Mrs. Deer, your AI companion to know about you?
            </label>
            <SpeechToTextInput
              as="textarea"
              id="message-mrs-deer"
              value={messageToMrsDeer}
              onChange={(e) => setMessageToMrsDeer(e.target.value)}
              placeholder="I'm building this because... I struggle with... I'm excited about... I'd love her to know that I..."
              maxLength={500}
              rows={5}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent resize-none text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
              {messageToMrsDeer.length}/500 characters • This helps Mrs. Deer, your AI companion understand you as a whole person. Share whatever feels right.
            </p>
          </div>
        </div>
      </div>

      {/* Unlock Deeper Insights */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
              Unlock Deeper Insights
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 mt-1">
              Answer a few more questions to get even more personalized coaching.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">
              {progressText}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Startup Stage */}
          <div>
            <label htmlFor="founder-stage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Startup Stage
            </label>
            <select
              id="founder-stage"
              value={founderStage}
              onChange={(e) => setFounderStage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <option value="">Select stage...</option>
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
            {founderStage === 'other' && (
              <SpeechToTextInput
                type="text"
                value={founderStageOther}
                onChange={(e) => setFounderStageOther(e.target.value)}
                placeholder="Please specify..."
                className="w-full mt-2 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
              />
            )}
          </div>

          {/* Primary Role */}
          <div>
            <label htmlFor="primary-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Primary Role
            </label>
            <select
              id="primary-role"
              value={primaryRole}
              onChange={(e) => setPrimaryRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <option value="">Select role...</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
            {primaryRole === 'other' && (
              <SpeechToTextInput
                type="text"
                value={primaryRoleOther}
                onChange={(e) => setPrimaryRoleOther(e.target.value)}
                placeholder="Please specify..."
                className="w-full mt-2 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
              />
            )}
          </div>

          {/* Weekly Hours */}
          <div>
            <label htmlFor="weekly-hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Weekly Hours
            </label>
            <select
              id="weekly-hours"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <option value="">Select hours...</option>
              {HOURS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Biggest Struggles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Biggest Struggles (select all that apply)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {founderStruggles.map((struggle) => {
                const Icon = struggle.icon
                const isSelected = struggles.includes(struggle.id)
                return (
                  <button
                    key={struggle.id}
                    type="button"
                    onClick={() => toggleStruggle(struggle.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-[#ef725c] bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-[#ef725c]' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-white">
                        {struggle.label}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#ef725c] ml-auto" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-4">
              <label htmlFor="struggles-other" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Other struggle not listed?
              </label>
              <SpeechToTextInput
                id="struggles-other"
                type="text"
                value={strugglesOther}
                onChange={(e) => setStrugglesOther(e.target.value)}
                placeholder="Tell us about it..."
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Years as Founder */}
          <div>
            <label htmlFor="years-founder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Years as Founder
            </label>
            <select
              id="years-founder"
              value={yearsAsFounder}
              onChange={(e) => setYearsAsFounder(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <option value="">Select years...</option>
              {YEARS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Founder Personality */}
          <div>
            <label htmlFor="founder-personality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Founder Personality (Fun)
            </label>
            <select
              id="founder-personality"
              value={founderPersonality}
              onChange={(e) => setFounderPersonality(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <option value="">Select personality...</option>
              {PERSONALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
            {founderPersonality === 'other' && (
              <SpeechToTextInput
                type="text"
                value={founderPersonalityOther}
                onChange={(e) => setFounderPersonalityOther(e.target.value)}
                placeholder="Describe your style..."
                className="w-full mt-2 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
              />
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-gray-900 dark:text-gray-100 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
            Preferences
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Email Digest</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Receive weekly summary emails</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailDigest(!emailDigest)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                emailDigest ? 'bg-[#ef725c]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow ring-0 transition ${
                  emailDigest ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="notification-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Notification Frequency
            </label>
            <select
              id="notification-frequency"
              value={notificationFrequency}
              onChange={(e) => setNotificationFrequency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <Link
              href="/settings/timezone"
              className="flex items-center gap-2 text-sm text-[#ef725c] hover:underline"
            >
              <Clock className="w-4 h-4" />
              Manage Timezone Settings
            </Link>
          </div>
        </div>
      </div>

      {/* User ID (read-only) */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">User ID (cannot be changed)</p>
        <p className="font-mono text-sm text-gray-900 dark:text-white break-all mt-1">{session?.user?.id}</p>
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

      {undoReset && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 flex items-center justify-between gap-3">
          <p className="text-sm">
            All data deleted. You can undo this action for 10 seconds.
          </p>
          <button
            type="button"
            onClick={handleUndoReset}
            disabled={undoInFlight}
            className="px-3 py-1 rounded bg-amber-700 text-white text-sm hover:bg-amber-800 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {undoInFlight ? 'Undoing...' : 'Undo'}
          </button>
        </div>
      )}

      {shouldShowDevTools && (
        <div className="mt-4 p-4 border-2 border-red-300 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">🧪 Dev Tools</span>
            <button
              type="button"
              onClick={() => setShowDevTools((v) => !v)}
              className="text-xs text-red-600 underline"
            >
              {showDevTools ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDevTools && (
            <div className="mt-2 space-y-3">
              <p className="text-xs text-red-700">
                ⚠️ Full reset deletes journal rows, morning draft autosave, and related data, resets streaks and
                onboarding flags, then hard-navigates to onboarding (clears React timers). A short server backup may
                still exist for undo via API, but the in-page Undo banner won&apos;t show after redirect.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={devResetLoading !== 'idle'}
                  onClick={async () => {
                    const sess = await getUserSession()
                    if (!sess?.user?.id) {
                      router.push('/auth/login')
                      return
                    }
                    const userEmail = sess.user.email || 'this account'
                    const confirmed = window.confirm(
                      `Are you sure you want to reset all data for ${userEmail}? This action cannot be undone.`
                    )
                    if (!confirmed) return
                    setDevResetLoading('onboarding')
                    const { data: authData } = await supabase.auth.getSession()
                    const headers: HeadersInit = { 'Content-Type': 'application/json' }
                    if (authData.session?.access_token) {
                      headers.Authorization = `Bearer ${authData.session.access_token}`
                    }
                    try {
                      const res = await fetch('/api/user/reset-onboarding', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ scope: 'onboarding' }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (!res.ok) {
                        console.error('[DevTools] Failed to reset onboarding:', data)
                        setMessage({
                          type: 'error',
                          text:
                            typeof data?.error === 'string'
                              ? data.error
                              : 'Failed to reset onboarding. Check console for details.',
                        })
                        setDevResetLoading('idle')
                        return
                      }
                      window.location.assign('/onboarding/goal')
                    } catch (err) {
                      console.error('[DevTools] reset onboarding fetch failed:', err)
                      setMessage({
                        type: 'error',
                        text: 'Network error while resetting onboarding. Check console.',
                      })
                      setDevResetLoading('idle')
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {devResetLoading === 'onboarding' ? 'Deleting…' : '🔄 Reset Onboarding'}
                </button>
                <button
                  type="button"
                  disabled={devResetLoading !== 'idle'}
                  onClick={async () => {
                    const sess = await getUserSession()
                    if (!sess?.user?.id) {
                      router.push('/auth/login')
                      return
                    }
                    const userEmail = sess.user.email || 'this account'
                    const confirmed = window.confirm(
                      `Nuclear reset: delete all journal data for ${userEmail}, reset streaks and onboarding flags, then go to onboarding. Continue?`
                    )
                    if (!confirmed) return
                    setDevResetLoading('full')
                    const { data: authData } = await supabase.auth.getSession()
                    const headers: HeadersInit = { 'Content-Type': 'application/json' }
                    if (authData.session?.access_token) {
                      headers.Authorization = `Bearer ${authData.session.access_token}`
                    }
                    try {
                      const res = await fetch('/api/user/reset-onboarding', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ scope: 'full' }),
                      })
                      const raw = await res.text()
                      const data = (() => {
                        if (!raw) return {}
                        try {
                          return JSON.parse(raw) as Record<string, unknown>
                        } catch {
                          return {}
                        }
                      })()
                      if (!res.ok) {
                        const debugLine = `[DevTools] reset-all failed status=${res.status} ${res.statusText} body=${raw || '<empty>'}`
                        console.error(debugLine)
                        setMessage({
                          type: 'error',
                          text:
                            typeof data?.error === 'string'
                              ? data.error
                              : `Failed to reset all entries (HTTP ${res.status}). ${raw ? `Server says: ${raw}` : 'No response body.'}`,
                        })
                        setDevResetLoading('idle')
                        return
                      }
                      if (typeof data?.warning === 'string' && data.warning) {
                        console.warn('[DevTools] reset-all warning:', data.warning)
                      }
                      window.location.assign('/onboarding/goal')
                    } catch (err) {
                      console.error('[DevTools] reset-all fetch failed:', err)
                      setMessage({
                        type: 'error',
                        text: 'Network error while resetting. Check console.',
                      })
                      setDevResetLoading('idle')
                    }
                  }}
                  className="px-3 py-1 bg-red-700 text-white text-sm rounded hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {devResetLoading === 'full' ? 'Deleting…' : '🧨 Reset Onboarding + All Entries'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-[#152b50] text-white rounded-lg font-semibold hover:bg-[#1a3565] transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
