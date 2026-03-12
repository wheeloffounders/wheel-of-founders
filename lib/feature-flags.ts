/**
 * Feature flags for gradual rollout.
 * New onboarding flow (simplified morning, celebration modal, optional tutorial) is dev-only until ready.
 */

/**
 * New onboarding flow: simplified morning page, FirstTimeSuccessModal, optional TutorialCard, ComprehensiveTour.
 * Only enabled in development. Production uses the stable morning page with Amy's fixes.
 */
export function isNewOnboardingEnabled(): boolean {
  return process.env.NODE_ENV === 'development'
}
