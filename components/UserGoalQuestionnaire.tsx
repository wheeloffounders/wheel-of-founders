'use client'

import { useState } from 'react'
import { getUserSession } from '@/lib/auth'
import { saveUserGoals, UserGoal } from '@/lib/user-language'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'

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
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selectedGoal) return

    setSaving(true)
    try {
      const session = await getUserSession()
      if (!session) {
        console.error('User not authenticated')
        return
      }

      await saveUserGoals(session.user.id, selectedGoal)
      
      // Mark questionnaire as completed
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(QUESTIONNAIRE_KEY, 'true')
      }

      onComplete()
    } catch (error) {
      console.error('Failed to save user goals:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 my-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FAFBFC] dark:bg-[#0F1419] flex items-center justify-center overflow-hidden">
            <Image
              src="/mrs-deer.png"
              alt="Mrs. Deer"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0]">
              Let's get to know you
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This helps us personalize your experience
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900 dark:text-[#E2E8F0] mb-4">
            {QUESTIONS[0].question}
          </p>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {QUESTIONS[0].options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedGoal(option.value)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedGoal === option.value
                    ? 'border-[#ef725c] bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#0F1419]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{option.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-[#E2E8F0]">
                        {option.label}
                      </span>
                      {selectedGoal === option.value && (
                        <Check className="w-4 h-4 text-[#ef725c] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedGoal || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ef725c] text-white text-sm font-medium hover:bg-[#e8654d] disabled:opacity-50 disabled:cursor-not-allowed transition"
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
  )
}

/**
 * Check if questionnaire has been completed
 */
export function isQuestionnaireCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(QUESTIONNAIRE_KEY) === 'true'
}
