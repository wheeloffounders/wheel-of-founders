'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

interface StepGoalProps {
  userId: string
  onComplete: () => void
  onSkip?: () => void
}

export function StepGoal({ userId, onComplete, onSkip }: StepGoalProps) {
  const [goal, setGoal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Skip this step if user already has primary_goal_text
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('primary_goal_text')
          .eq('id', userId)
          .maybeSingle()

        if ((data as { primary_goal_text?: string } | null)?.primary_goal_text?.trim()) {
          onCompleteRef.current()
          return
        }
      } catch {
        // Continue to show form
      } finally {
        setIsChecking(false)
      }
    }
    checkExisting()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          primary_goal_text: goal.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="thoughtful" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion</p>
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: colors.navy.DEFAULT }}>
        Tell Mrs. Deer your goal
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This helps her personalize your insights from day one.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            In two sentences, what&apos;s your primary goal right now?
          </label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Launch my SaaS MVP in 3 months while staying sane. Build a daily rhythm that doesn't burn me out."
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={4}
            disabled={isSubmitting}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Mrs. Deer will read this and weave it into your insights.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!goal.trim() || isSubmitting}
          className="w-full py-3 px-4 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition text-white"
          style={{
            backgroundColor: colors.coral.DEFAULT,
          }}
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Skip for now
          </button>
        )}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          You&apos;ll get a reminder in a few days to complete your profile. The more Mrs. Deer knows, the better she can help.
        </p>
      </div>
    </div>
  )
}
