'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { supabase } from '@/lib/supabase'
import { TutorialProgress } from '@/components/TutorialProgress'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'
import { inferPrimaryGoalEnumFromFreeText } from '@/lib/social-proof'

export default function GoalPage() {
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    trackJourneyStep('viewed_goal')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      console.log('[Goal] User:', user.id)
      console.log('[Goal] Goal text:', goal.trim().slice(0, 50) + (goal.length > 50 ? '...' : ''))

      // Check if profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, primary_goal, primary_goal_text, onboarding_step')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('[Goal] Profile fetch error:', profileError)
        throw new Error(profileError.message)
      }
      console.log('[Goal] Existing profile:', existingProfile ? 'exists' : 'null')

      const inferredEnum = inferPrimaryGoalEnumFromFreeText(goal.trim())
      const row = existingProfile as { primary_goal?: string | null } | null
      const payload: Record<string, unknown> = {
        primary_goal_text: goal.trim(),
        onboarding_step: 1,
        updated_at: new Date().toISOString(),
      }
      if (!row?.primary_goal?.trim() && inferredEnum) {
        payload.primary_goal = inferredEnum
      }

      if (!existingProfile) {
        // Profile doesn't exist - upsert to create (auth callback may not have run)
        console.log('[Goal] Upserting new profile')
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(
            { id: user.id, email_address: user.email ?? undefined, ...payload },
            { onConflict: 'id' }
          )

        if (upsertError) {
          console.error('[Goal] Upsert error:', upsertError)
          throw new Error(upsertError.message)
        }
        console.log('[Goal] Upsert successful')
      } else {
        // Update existing profile
        console.log('[Goal] Updating existing profile')
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(payload)
          .eq('id', user.id)

        if (updateError) {
          console.error('[Goal] Update error:', updateError)
          throw new Error(updateError.message)
        }
        console.log('[Goal] Update successful')
      }

      trackJourneyStep('completed_goal', { goal_length: goal.trim().length })
      router.replace('/onboarding/social-proof')
    } catch (err: any) {
      // Handle AbortError specifically (common on mobile/slow networks)
      if (err?.name === 'AbortError' || err?.code === 'ABORT_ERR') {
        console.warn('[Goal] Request aborted, navigating anyway:', err)
        router.replace('/onboarding/social-proof')
        return
      }
      console.error('[Goal] Caught error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save goal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <TutorialProgress currentStep={1} />

      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="thoughtful" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: colors.navy.DEFAULT }}>
        What&apos;s your primary goal?
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This helps Mrs. Deer personalize your insights.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., Launch my SaaS MVP in 3 months while staying sane..."
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-32"
          required
        />

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !goal.trim()}
          className="w-full py-3 bg-[#ef725c] text-white rounded-lg disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
