'use client'

import { useEffect, useState } from 'react'
import { UserGoalQuestionnaire, isQuestionnaireCompleted } from './UserGoalQuestionnaire'
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import { isOnboardingCompleted } from '@/lib/onboarding'
import { getUserSession } from '@/lib/auth'
import { useUserProfile } from '@/lib/hooks/useUserProfile'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

export function OnboardingWizard() {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checking, setChecking] = useState(true)
  const { profile } = useUserProfile()
  const { hideOnboarding, loading: hideLoading } = useOnboarding()

  useEffect(() => {
    const check = async () => {
      if (typeof window === 'undefined') return

      // Wait for hide_onboarding to load; if user opted out, never show
      if (hideLoading) return
      if (hideOnboarding) {
        setShowQuestionnaire(false)
        setShowOnboarding(false)
        setChecking(false)
        return
      }

      const questionnaireDone = isQuestionnaireCompleted()
      if (!questionnaireDone) {
        setShowQuestionnaire(true)
        setChecking(false)
        return
      }

      const session = await getUserSession()
      if (!session) {
        setChecking(false)
        return
      }

      const completed = await isOnboardingCompleted(session.user.id)
      if (!completed) {
        setShowOnboarding(true)
      }
      setChecking(false)
    }

    check()
  }, [hideOnboarding, hideLoading])

  const handleQuestionnaireComplete = () => {
    setShowQuestionnaire(false)
    setShowOnboarding(true)
  }

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false)
    setShowOnboarding(true)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleOnboardingSkip = () => {
    setShowOnboarding(false)
    // Per requirements: show again next session until completed
  }

  if (checking) return null

  if (showQuestionnaire) {
    return (
      <UserGoalQuestionnaire
        onComplete={handleQuestionnaireComplete}
        onSkip={handleQuestionnaireSkip}
      />
    )
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        preferredName={profile?.preferred_name ?? null}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    )
  }

  return null
}
