'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { TutorialProgress } from '@/components/TutorialProgress'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

export default function GoalPage() {
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const session = await getUserSession()
      if (!session?.user?.id) {
        router.push('/login')
        return
      }

      await (supabase.from('user_profiles') as any)
        .update({
          primary_goal_text: goal.trim(),
          onboarding_step: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      router.push('/morning?tutorial=true')
    } catch (err) {
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
          {saving ? 'Saving...' : 'Continue to Morning Plan →'}
        </button>
      </form>
    </div>
  )
}
