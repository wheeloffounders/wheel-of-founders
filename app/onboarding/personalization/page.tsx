'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { supabase } from '@/lib/supabase'
import { ArrowRight } from 'lucide-react'
import { TutorialProgress } from '@/components/TutorialProgress'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'
import { founderStruggles } from '@/lib/founder-struggles'

export default function PersonalizationPage() {
  const [selectedStruggles, setSelectedStruggles] = useState<string[]>([])
  const [otherStruggle, setOtherStruggle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    trackJourneyStep('viewed_personalization')
  }, [])

  const toggleStruggle = (id: string) => {
    setSelectedStruggles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      await (supabase.from('user_profiles') as any)
        .update({
          struggles: selectedStruggles,
          struggles_other: otherStruggle.trim() || null,
          onboarding_step: 2,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      trackJourneyStep('completed_personalization', { struggle_count: selectedStruggles.length })
      // Onboarding complete: new flow sends to simplified morning; production uses stable morning
      const { isNewOnboardingEnabled } = await import('@/lib/feature-flags')
      const qs = isNewOnboardingEnabled() ? '?first=true' : ''
      router.push(`/morning${qs}`)
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === 'ABORT_ERR') {
        console.warn('[Personalization] Request aborted, navigating anyway:', err)
        const { isNewOnboardingEnabled } = await import('@/lib/feature-flags')
        const qs = isNewOnboardingEnabled() ? '?first=true' : ''
        router.push(`/morning${qs}`)
        return
      }
      console.error('Failed to save:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <TutorialProgress currentStep={2} />

      <div className="mb-8 flex items-center gap-4">
        <MrsDeerAvatar expression="thoughtful" size="large" />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.navy.DEFAULT }}>
            What brings you here?
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Mrs. Deer wants to understand what you&apos;re working through.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              What are you hoping to work on? (select all that apply)
            </label>
            <div className="grid gap-3">
              {founderStruggles.map((struggle) => {
                const Icon = struggle.icon
                const isSelected = selectedStruggles.includes(struggle.id)
                return (
                  <button
                    key={struggle.id}
                    type="button"
                    onClick={() => toggleStruggle(struggle.id)}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-[#ef725c] bg-[#fef6f3] dark:bg-gray-700 dark:border-[#ef725c]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isSelected ? 'text-[#ef725c]' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{struggle.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{struggle.description}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#ef725c] text-white flex items-center justify-center text-xs flex-shrink-0">
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Anything else you&apos;d like Mrs. Deer to know? (optional)
            </label>
            <textarea
              value={otherStruggle}
              onChange={(e) => setOtherStruggle(e.target.value)}
              placeholder="e.g., I'm launching my first startup and feeling overwhelmed..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#152b50] focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || selectedStruggles.length === 0}
            className="w-full py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : 'Plan my first day →'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
