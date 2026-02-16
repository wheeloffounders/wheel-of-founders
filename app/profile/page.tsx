'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles, Check, Edit2, Settings, Clock, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getUserGoal, getUserLanguage, UserGoal } from '@/lib/user-language'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'

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

const STRUGGLE_OPTIONS = [
  { value: 'prioritization', label: 'Prioritization', emoji: '🎯' },
  { value: 'decision_fatigue', label: 'Decision fatigue', emoji: '🧠' },
  { value: 'momentum', label: 'Momentum', emoji: '⚡' },
  { value: 'burnout', label: 'Burnout', emoji: '🔥' },
  { value: 'visibility', label: 'Visibility', emoji: '📣' },
  { value: 'revenue', label: 'Revenue', emoji: '💰' },
  { value: 'team', label: 'Team', emoji: '👥' },
  { value: 'balance', label: 'Balance', emoji: '🧘' },
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

  useEffect(() => {
    const loadProfile = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }

      let profileData: Record<string, unknown> | null = null
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        profileData = data as Record<string, unknown> | null

        if (data) {
          setName(data.name || '')
          setPreferredName(data.preferred_name || '')
          setCompanyName(data.company_name || '')
          setPrimaryGoal(data.primary_goal)
          setPrimaryGoalText(data.primary_goal_text || '')
          setDestressActivity(data.destress_activity || '')
          setHobbies(data.hobbies || [])
          setHobbiesOther(data.hobbies_other || '')
          setMessageToMrsDeer(data.message_to_mrs_deer || '')
          setFounderStage(data.founder_stage || '')
          setFounderStageOther(data.founder_stage_other || '')
          setPrimaryRole(data.primary_role || '')
          setPrimaryRoleOther(data.primary_role_other || '')
          setWeeklyHours(data.weekly_hours || '')
          setStruggles(data.struggles || [])
          setStrugglesOther(data.struggles_other || '')
          setYearsAsFounder(data.years_as_founder || '')
          setFounderPersonality(data.founder_personality || '')
          setFounderPersonalityOther(data.founder_personality_other || '')
          setEmailDigest(data.email_digest ?? true)
          setNotificationFrequency(data.notification_frequency || 'daily')
          
          // Load existing profile insight if available
          // Try to fetch the most recent profile insight from personal_prompts
          const { data: insightData } = await supabase
            .from('personal_prompts')
            .select('prompt_text')
            .eq('user_id', session.user.id)
            .eq('prompt_type', 'profile')
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (insightData?.prompt_text) {
            setProfileInsight(insightData.prompt_text)
          }
        }

        // Load current goal
        const goal = await getUserGoal(session.user.id)
        setPrimaryGoal(goal)
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

  const toggleStruggle = (value: string) => {
    if (struggles.length >= 3 && !struggles.includes(value)) {
      setMessage({ type: 'error', text: 'Please select up to 3 struggles' })
      return
    }
    setStruggles((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
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

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Profile insight API failed:', response.status, errorText)
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate insight')
      }

      const data = await response.json()
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E2E8F0] flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#ef725c]" />
          Your Founder Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Mrs. Deer gets to know you better
        </p>
        {primaryGoal && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current goal:</span>
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

      {/* Mrs. Deer Profile Insight (permanent, always shown if exists) */}
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
            <p className="text-gray-700 dark:text-gray-300">
              Mrs. Deer is reflecting on your profile...
            </p>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0] mb-6">
          Basic Info
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your name <span className="text-[#ef725c]">*</span>
            </label>
            <SpeechToTextInput
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alex Chen"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This is how Mrs. Deer will greet you
            </p>
          </div>
          
          <div>
            <label htmlFor="preferred_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What should I call you? (optional)
            </label>
            <SpeechToTextInput
              type="text"
              id="preferred_name"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="e.g., Alex, Al, or leave blank to use your name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              A nickname or preferred name Mrs. Deer can use instead
            </p>
          </div>
          
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company name (optional)
            </label>
            <SpeechToTextInput
              type="text"
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Studios"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
          </div>
        </div>
      </div>

      {/* Your Founder Story */}
      <div className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-[#152b50]" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0]">
            Your Founder Story
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="primary-goal-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
            <p className="text-xs text-gray-500 mt-1">{primaryGoalText.length}/280 characters</p>
          </div>

          <div>
            <label htmlFor="destress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What do you do to decompress or destress?
            </label>
            <SpeechToTextInput
              as="textarea"
              id="destress"
              value={destressActivity}
              onChange={(e) => setDestressActivity(e.target.value)}
              placeholder="I run, play guitar, or cook something complicated..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
          </div>
        </div>
      </div>

      {/* A Little About You */}
      <div className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-[#152b50]" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0]">
              A Little About You
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Helps Mrs. Deer understand you as a whole person, not just a founder.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{hobby.emoji}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-[#E2E8F0]">
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
            <label htmlFor="hobbies-other" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Something else? Tell us:
            </label>
            <SpeechToTextInput
              id="hobbies-other"
              type="text"
              value={hobbiesOther}
              onChange={(e) => setHobbiesOther(e.target.value)}
              placeholder="e.g., Photography, Chess, Surfing..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
          </div>
          
          {/* Message to Mrs. Deer */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <label htmlFor="message-mrs-deer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Is there anything else you'd like Mrs. Deer to know about you?
            </label>
            <SpeechToTextInput
              as="textarea"
              id="message-mrs-deer"
              value={messageToMrsDeer}
              onChange={(e) => setMessageToMrsDeer(e.target.value)}
              placeholder="I'm building this because... I struggle with... I'm excited about... I'd love her to know that I..."
              maxLength={500}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {messageToMrsDeer.length}/500 characters • This helps Mrs. Deer understand you as a whole person. Share whatever feels right.
            </p>
          </div>
        </div>
      </div>

      {/* Unlock Deeper Insights */}
      <div className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-[#152b50]" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0]">
              Unlock Deeper Insights
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Answer a few more questions to get even more personalized coaching.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {progressText}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Startup Stage */}
          <div>
            <label htmlFor="founder-stage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Startup Stage
            </label>
            <select
              id="founder-stage"
              value={founderStage}
              onChange={(e) => setFounderStage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
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
                className="w-full mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
              />
            )}
          </div>

          {/* Primary Role */}
          <div>
            <label htmlFor="primary-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Role
            </label>
            <select
              id="primary-role"
              value={primaryRole}
              onChange={(e) => setPrimaryRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
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
                className="w-full mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
              />
            )}
          </div>

          {/* Weekly Hours */}
          <div>
            <label htmlFor="weekly-hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Weekly Hours
            </label>
            <select
              id="weekly-hours"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Biggest Struggles (select up to 3)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {STRUGGLE_OPTIONS.map((struggle) => (
                <button
                  key={struggle.value}
                  type="button"
                  onClick={() => toggleStruggle(struggle.value)}
                  disabled={!struggles.includes(struggle.value) && struggles.length >= 3}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    struggles.includes(struggle.value)
                      ? 'border-[#ef725c] bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{struggle.emoji}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-[#E2E8F0]">
                      {struggle.label}
                    </span>
                    {struggles.includes(struggle.value) && (
                      <Check className="w-4 h-4 text-[#ef725c] ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label htmlFor="struggles-other" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Other struggle not listed?
              </label>
              <SpeechToTextInput
                id="struggles-other"
                type="text"
                value={strugglesOther}
                onChange={(e) => setStrugglesOther(e.target.value)}
                placeholder="Tell us about it..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
              />
            </div>
          </div>

          {/* Years as Founder */}
          <div>
            <label htmlFor="years-founder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Years as Founder
            </label>
            <select
              id="years-founder"
              value={yearsAsFounder}
              onChange={(e) => setYearsAsFounder(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
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
            <label htmlFor="founder-personality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Founder Personality (Fun)
            </label>
            <select
              id="founder-personality"
              value={founderPersonality}
              onChange={(e) => setFounderPersonality(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
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
                className="w-full mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-[#152b50]" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0]">
            Preferences
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-[#E2E8F0]">Email Digest</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly summary emails</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailDigest(!emailDigest)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                emailDigest ? 'bg-[#ef725c]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  emailDigest ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="notification-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Frequency
            </label>
            <select
              id="notification-frequency"
              value={notificationFrequency}
              onChange={(e) => setNotificationFrequency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/settings/timezone"
              className="flex items-center gap-2 text-sm text-[#152b50] hover:underline"
            >
              <Clock className="w-4 h-4" />
              Manage Timezone Settings
            </Link>
          </div>
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
      <div className="flex justify-end gap-3">
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
