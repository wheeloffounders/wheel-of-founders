
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Check, Clock } from 'lucide-react'
import { ProfileIdentityHeader } from '@/components/profile/ProfileIdentityHeader'
import { ProfileBlueprintCard } from '@/components/profile/ProfileBlueprintCard'
import { ProfileMonoPillToggle } from '@/components/profile/ProfileMonoPillToggle'
import {
  profileDossierChipClassName,
  profileDossierHintClassName,
  profileDossierInputClassName,
  profileDossierLabelClassName,
} from '@/lib/founder-dna/profile-dossier-styles'
import { founderStruggles } from '@/lib/founder-struggles'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getUserGoal, getUserLanguage, UserGoal } from '@/lib/user-language'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import {
  morningInsightStreamingBannerClassName,
  morningInsightSurfaceClassName,
} from '@/lib/morning/morning-insight-surface'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'
import { cn } from '@/components/ui/utils'
import { isDevelopment, isPreview } from '@/lib/env'
import { isDevProfileMasterSwitchEmail } from '@/lib/dev-profile-master-switch-emails'
import { invalidateUserProfileBundle } from '@/lib/user-profile-bundle-cache'

type SubscriptionOverrideValue = 'none' | 'pro' | 'free'

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

  const [subscriptionOverride, setSubscriptionOverride] = useState<SubscriptionOverrideValue>('none')
  const [overrideBusy, setOverrideBusy] = useState(false)

  // Determine if dev tools should be visible (dev, preview, or ?dev=true)
  let shouldShowDevTools = isDevelopment || isPreview
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const forceDev = params.get('dev') === 'true'
    if (forceDev) {
      shouldShowDevTools = true
    }
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
  const [profileCompletedAt, setProfileCompletedAt] = useState<string | null>(null)

  const masterSwitchEligible =
    Boolean(session?.user?.email) && isDevProfileMasterSwitchEmail(session?.user?.email)

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
          setProfileCompletedAt((data.profile_completed_at as string) || null)
          {
            const ov = String((data as { subscription_override?: string }).subscription_override ?? 'none')
              .trim()
              .toLowerCase()
            setSubscriptionOverride(ov === 'pro' || ov === 'free' ? (ov as SubscriptionOverrideValue) : 'none')
          }
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
            subscription_override: subscriptionOverride,
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
      if (completedCount >= 6) {
        setProfileCompletedAt(new Date().toISOString())
      }
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

  const applySubscriptionOverride = async (value: SubscriptionOverrideValue) => {
    if (!masterSwitchEligible || overrideBusy) return
    setOverrideBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/subscription-override', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: typeof j.error === 'string' ? j.error : 'Failed to update subscription override',
        })
        return
      }
      setSubscriptionOverride(value)
      setMessage({
        type: 'success',
        text:
          value === 'none'
            ? 'Using standard trial and subscription rules.'
            : `Developer override: ${value === 'pro' ? 'always Pro' : 'always Free (paywalled)'}.`,
      })
      setTimeout(() => setMessage(null), 4000)
      if (typeof window !== 'undefined') {
        invalidateUserProfileBundle()
        window.dispatchEvent(new Event('data-sync-request'))
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while updating override.' })
    } finally {
      setOverrideBusy(false)
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

  const dossierStatusLine = profileCompletedAt
    ? 'STATUS // CORESYSTEM ONBOARDED'
    : 'STATUS // MAPPING IN PROGRESS'

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="mb-6 text-sm italic text-gray-600 dark:text-gray-400">
        Mrs. Deer uses this dossier as your private founder context — not a generic settings form.
      </p>

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
        <div className={cn(morningInsightSurfaceClassName, 'mb-8')}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 shrink-0" style={{ color: '#FBBF24' }} aria-hidden />
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              Profile Insight
            </span>
          </div>
          <div
            className={morningInsightStreamingBannerClassName}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-amber-950/90 dark:text-amber-100">
              Mrs. Deer is reflecting on your dossier…
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/75">
              Profile saved — your insight will appear here shortly.
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-900/50">
              <div className="h-full w-2/5 animate-pulse rounded-full bg-[#ef725c]/70 dark:bg-[#f0886c]/60" />
            </div>
          </div>
        </div>
      )}

      <ProfileIdentityHeader
        name={name}
        onNameChange={setName}
        preferredName={preferredName}
        onPreferredNameChange={setPreferredName}
        companyName={companyName}
        onCompanyNameChange={setCompanyName}
        email={session?.user?.email}
        statusLine={dossierStatusLine}
        primaryGoal={primaryGoal}
        dashboardTitle={lang.dashboardTitle}
        progressText={progressText}
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
        <ProfileBlueprintCard
          variant="strategic"
          pillarLabel="Strategic anchors"
          title="Long-term context"
          aria-labelledby="profile-strategic"
        >
          <div>
            <label htmlFor="primary-goal-text" className={profileDossierLabelClassName}>
              Core intentions
            </label>
            <SpeechToTextInput
              as="textarea"
              id="primary-goal-text"
              value={primaryGoalText}
              onChange={(e) => setPrimaryGoalText(e.target.value)}
              placeholder="I'm building a SaaS for creators and trying to figure out pricing..."
              maxLength={280}
              rows={3}
              className={cn(profileDossierInputClassName, 'resize-none')}
            />
            <p className={profileDossierHintClassName}>{primaryGoalText.length}/280 characters</p>
          </div>

          <div>
            <label htmlFor="destress" className={profileDossierLabelClassName}>
              About you — decompression
            </label>
            <SpeechToTextInput
              as="textarea"
              id="destress"
              value={destressActivity}
              onChange={(e) => setDestressActivity(e.target.value)}
              placeholder="I run, play guitar, or cook something complicated..."
              rows={2}
              className={cn(profileDossierInputClassName, 'resize-none')}
            />
          </div>

          <div>
            <label className={profileDossierLabelClassName}>
              About you — hobbies {'&'} life outside work
            </label>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Helps Mrs. Deer understand you as a whole person, not just a founder.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
              {HOBBY_OPTIONS.map((hobby) => {
                const selected = hobbies.includes(hobby.value)
                return (
                  <button
                    key={hobby.value}
                    type="button"
                    onClick={() => toggleHobby(hobby.value)}
                    className={profileDossierChipClassName(selected)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{hobby.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{hobby.label}</span>
                      {selected ? <Check className="ml-auto h-4 w-4 text-slate-900 dark:text-slate-100" /> : null}
                    </div>
                  </button>
                )
              })}
            </div>
            <label htmlFor="hobbies-other" className={profileDossierLabelClassName}>
              Other interests
            </label>
            <SpeechToTextInput
              id="hobbies-other"
              type="text"
              value={hobbiesOther}
              onChange={(e) => setHobbiesOther(e.target.value)}
              placeholder="Photography, chess, surfing…"
              className={profileDossierInputClassName}
            />
          </div>

          <div className="border-t border-slate-200/60 pt-6 dark:border-slate-700/60">
            <label htmlFor="message-mrs-deer" className={profileDossierLabelClassName}>
              Message to Mrs. Deer
            </label>
            <SpeechToTextInput
              as="textarea"
              id="message-mrs-deer"
              value={messageToMrsDeer}
              onChange={(e) => setMessageToMrsDeer(e.target.value)}
              placeholder={"I'm building this because… I struggle with… I'd love her to know…"}
              maxLength={500}
              rows={5}
              className={cn(profileDossierInputClassName, 'resize-none')}
            />
            <p className={profileDossierHintClassName}>
              {messageToMrsDeer.length}/500 characters
            </p>
          </div>
        </ProfileBlueprintCard>

        <ProfileBlueprintCard
          variant="operational"
          pillarLabel="Operational parameters"
          title="Weekly guardrails"
          aria-labelledby="profile-operational"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">{progressText}</p>

          <div>
            <label htmlFor="founder-stage" className={profileDossierLabelClassName}>
              Work schedule — startup stage
            </label>
            <select
              id="founder-stage"
              value={founderStage}
              onChange={(e) => setFounderStage(e.target.value)}
              className={profileDossierInputClassName}
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
                className={cn(profileDossierInputClassName, 'mt-2')}
              />
            )}
          </div>

          <div>
            <label htmlFor="primary-role" className={profileDossierLabelClassName}>
              Work schedule — primary role
            </label>
            <select
              id="primary-role"
              value={primaryRole}
              onChange={(e) => setPrimaryRole(e.target.value)}
              className={profileDossierInputClassName}
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
                className={cn(profileDossierInputClassName, 'mt-2')}
              />
            )}
          </div>

          <div>
            <label htmlFor="weekly-hours" className={profileDossierLabelClassName}>
              Work schedule — weekly hours
            </label>
            <select
              id="weekly-hours"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className={profileDossierInputClassName}
            >
              <option value="">Select hours...</option>
              {HOURS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={profileDossierLabelClassName}>
              Guardrails — biggest struggles
            </label>
            <div className="mb-4 grid grid-cols-2 gap-3">
              {founderStruggles.map((struggle) => {
                const Icon = struggle.icon
                const isSelected = struggles.includes(struggle.id)
                return (
                  <button
                    key={struggle.id}
                    type="button"
                    onClick={() => toggleStruggle(struggle.id)}
                    className={profileDossierChipClassName(isSelected)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-gray-400',
                        )}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{struggle.label}</span>
                      {isSelected ? (
                        <Check className="ml-auto h-4 w-4 text-slate-900 dark:text-slate-100" />
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
            <label htmlFor="struggles-other" className={profileDossierLabelClassName}>
              Other struggle
            </label>
            <SpeechToTextInput
              id="struggles-other"
              type="text"
              value={strugglesOther}
              onChange={(e) => setStrugglesOther(e.target.value)}
              placeholder="Tell us about it…"
              className={profileDossierInputClassName}
            />
          </div>

          <div>
            <label htmlFor="years-founder" className={profileDossierLabelClassName}>
              Founder tenure
            </label>
            <select
              id="years-founder"
              value={yearsAsFounder}
              onChange={(e) => setYearsAsFounder(e.target.value)}
              className={profileDossierInputClassName}
            >
              <option value="">Select years...</option>
              {YEARS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="founder-personality" className={profileDossierLabelClassName}>
              Founder personality
            </label>
            <select
              id="founder-personality"
              value={founderPersonality}
              onChange={(e) => setFounderPersonality(e.target.value)}
              className={profileDossierInputClassName}
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
                className={cn(profileDossierInputClassName, 'mt-2')}
              />
            )}
          </div>

          <div className="border-t border-slate-200/60 pt-6 dark:border-slate-700/60">
            <p className={profileDossierLabelClassName}>Notification matrix</p>
            <ProfileMonoPillToggle
              id="email-digest"
              enabled={emailDigest}
              onToggle={() => setEmailDigest(!emailDigest)}
              label="Email digest"
              description="Weekly summary emails from Mrs. Deer"
            />
          </div>

          <div>
            <label htmlFor="notification-frequency" className={profileDossierLabelClassName}>
              Notification frequency
            </label>
            <select
              id="notification-frequency"
              value={notificationFrequency}
              onChange={(e) => setNotificationFrequency(e.target.value)}
              className={profileDossierInputClassName}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
            <Link
              href="/settings/timezone"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-[#ef725c] uppercase hover:underline"
            >
              <Clock className="h-4 w-4" />
              Timezone settings
            </Link>
          </div>
        </ProfileBlueprintCard>
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

      {masterSwitchEligible ? (
        <div className="mb-6 rounded-lg border border-zinc-600 bg-zinc-900 p-4 text-zinc-100 shadow-inner">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Developer settings</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Master switch for this account only. Pro = always unlocked; Freemium = always paywalled; Standard = normal
            trial and Stripe rules.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { value: 'pro' as const, label: 'Pro mode' },
                { value: 'free' as const, label: 'Freemium mode' },
                { value: 'none' as const, label: 'Standard / timer' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={overrideBusy}
                onClick={() => void applySubscriptionOverride(value)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                  subscriptionOverride === value
                    ? 'border-[#ef725c] bg-[#ef725c]/20 text-white'
                    : 'border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-zinc-500'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
          {overrideBusy ? <p className="mt-2 text-xs text-zinc-500">Updating…</p> : null}
        </div>
      ) : null}

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
