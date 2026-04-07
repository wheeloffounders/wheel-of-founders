'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { SocialProofStep } from '@/components/onboarding/SocialProofStep'

export default function OnboardingSocialProofPage() {
  const router = useRouter()

  useEffect(() => {
    trackJourneyStep('viewed_social_proof')
  }, [])

  return (
    <SocialProofStep
      onContinue={() => {
        trackJourneyStep('completed_social_proof')
        router.push('/onboarding/personalization')
      }}
    />
  )
}
