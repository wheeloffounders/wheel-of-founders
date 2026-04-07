/**
 * User journey tracking for funnel analysis.
 * Sends to /api/analytics/feature-usage with feature_name='user_journey'.
 * Fire-and-forget; non-blocking.
 */

export type JourneyStep =
  | 'signed_up'
  | 'viewed_goal'
  | 'completed_goal'
  | 'viewed_social_proof'
  | 'completed_social_proof'
  | 'viewed_personalization'
  | 'completed_personalization'
  | 'started_tutorial'
  | 'tutorial_step_1' // Today button
  | 'tutorial_step_2' // Morning menu
  | 'tutorial_step_3' // Morning brain dump
  | 'tutorial_step_4' // Intention / daily pivot (Joyride; was check-in before streamlined onboarding)
  | 'tutorial_step_5' // Power list (tactical stream)
  | 'tutorial_step_6' // Save morning
  | 'tutorial_step_7' // Legacy: save (older 7-step Joyride)
  | 'completed_tutorial'
  | 'viewed_morning'
  | 'typed_first_task'
  | 'saved_morning'
  | 'viewed_evening'
  | 'saved_evening'
  | 'returned_next_day'
  | 'completed_comprehensive_tour'

export function trackJourneyStep(
  step: JourneyStep,
  metadata?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return
  fetch('/api/analytics/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature_name: 'user_journey',
      action: step,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      metadata: { ...metadata, step },
    }),
    credentials: 'include',
  }).catch(() => {})
}
