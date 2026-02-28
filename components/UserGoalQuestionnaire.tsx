'use client'

import { useState } from 'react'
import { getUserSession } from '@/lib/auth'
import { saveUserGoals, UserGoal } from '@/lib/user-language'
import { ArrowRight, Check } from 'lucide-react'
import { MrsDeerAvatar } from './MrsDeerAvatar'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

const QUESTIONNAIRE_KEY = 'wof_questionnaire_completed_v1'

interface Question {
  id: string
  question: string
  options: Array<{
    value: UserGoal
    label: string
    description: string
    emoji: string
  }>
}

const QUESTIONS: Question[] = [
  {
    id: 'primary_goal',
    question: 'What brings you here today?',
    options: [
      {
        value: 'find_purpose',
        label: 'Finding my purpose',
        description: 'I need clarity on what truly matters',
        emoji: '🎯',
      },
      {
        value: 'build_significance',
        label: 'Build a meaningful business',
        description: 'I want my business to grow and leave a mark',
        emoji: '🌟',
      },
      {
        value: 'reduce_overwhelm',
        label: 'Reducing overwhelm',
        description: 'I\'m drowning in too many small tasks',
        emoji: '🌊',
      },
      {
        value: 'break_through_stuck',
        label: 'Breaking through stuck',
        description: 'I\'m doing everything but still feel stuck',
        emoji: '🚀',
      },
      {
        value: 'improve_focus',
        label: 'Improving focus',
        description: 'I need better clarity and focus',
        emoji: '🔍',
      },
      {
        value: 'build_systems',
        label: 'Building systems',
        description: 'I want to systemize and delegate better',
        emoji: '⚙️',
      },
      {
        value: 'general_clarity',
        label: 'General clarity',
        description: 'I want better decision-making and clarity',
        emoji: '💡',
      },
      {
        value: 'stay_motivated',
        label: 'Staying motivated',
        description: 'I know what to do, I just struggle to do it consistently',
        emoji: '💪',
      },
      {
        value: 'find_calm',
        label: 'Finding calm',
        description: 'I\'m productive but never feel settled or at peace',
        emoji: '🧘',
      },
    ],
  },
]

interface UserGoalQuestionnaireProps {
  onComplete: () => void
  onSkip: () => void
}

export function UserGoalQuestionnaire({ onComplete, onSkip }: UserGoalQuestionnaireProps) {
  const [selectedGoals, setSelectedGoals] = useState<Set<UserGoal>>(new Set())
  const [saving, setSaving] = useState(false)
  const { hideOnboarding, setHideForever } = useOnboarding()

  const toggleGoal = (goal: UserGoal) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goal)) next.delete(goal)
      else next.add(goal)
      return next
    })
  }

  const handleSave = async () => {
    if (selectedGoals.size === 0) return

    setSaving(true)
    try {
      const session = await getUserSession()
      if (!session) {
        console.error('User not authenticated')
        return
      }

      const goalsArray = Array.from(selectedGoals)
      const primaryGoal = goalsArray[0]
      const secondaryGoals = goalsArray.slice(1).map((g) => g as string)
      await saveUserGoals(session.user.id, primaryGoal, secondaryGoals)
      
      // Mark questionnaire as completed
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(QUESTIONNAIRE_KEY, 'true')
      }

      // Persist "Don't show again" to database (cross-device)
      if (hideOnboarding) await setHideForever(true)

      onComplete()
    } catch (error) {
      console.error('Failed to save user goals:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (hideOnboarding) await setHideForever(true)
    onSkip()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 
backdrop-blur-sm px-4 py-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 dark:bg-[#1A202C] rounded-none border-2 
border-[#152b50] shadow-lg w-full max-w-md px-4 md:px-5 py-4 md:py-5 sm:py-6 my-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <MrsDeerAvatar expression="welcoming" size="medium" />
          <div>
            <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0]">
              Let's get to know you
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400">
              This helps us personalize your experience
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-[#E2E8F0] 
mb-4">
            {QUESTIONS[0].question}
          </p>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {QUESTIONS[0].options.map((option) => {
              const isSelected = selectedGoals.has(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleGoal(option.value)}
                  className={`w-full text-left p-4 rounded-none border-2 transition-all ${
                    isSelected
                      ? 'border-[#ef725c] bg-[#FFF0EC] dark:bg-amber-900/20'
                      : 'border-[#152b50] hover:border-[#1A3565] bg-white dark:bg-gray-800 dark:bg-[#0F1419]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-[#ef725c] bg-amber-50' : 'border-gray-300 dark:border-gray-600'}`}>
                        {isSelected && <Check className="w-3 h-3 text-[#ef725c]" />}
                      </div>
                      <span className="text-2xl">{option.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold txt-gray-900 dark:text-gray-100 dark:text-[#E2E8F0]">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
          {/* Don't show again checkbox */}
          <div className="mb-3 flex items-center">
            <input
              type="checkbox"
              id="hideOnboarding"
              checked={hideOnboarding}
              onChange={(e) => setHideForever(e.target.checked)}
              className="w-4 h-4 text-[#ef725c] bg-gray-100 border-gray-300 rounded focus:ring-[#ef725c] focus:ring-2"
            />
            <label htmlFor="hideOnboarding" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Don't show this again
            </label>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedGoals.size === 0 || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-none border-2 
border-[#e8654d] bg-[#ef725c] text-white text-sm font-medium hover:bg-[#e8654d] 
disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Saving...' : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Check if questionnaire has been completed
 */
export function isQuestionnaireCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(QUESTIONNAIRE_KEY) === 'true'
}
