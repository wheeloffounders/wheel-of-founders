/**
 * Feature flags for gradual rollout.
 */

/**
 * New onboarding flow: simplified morning page, celebration modal, benefit-driven CTAs.
 * Enabled for all environments (production, preview, development).
 */
export function isNewOnboardingEnabled(): boolean {
  return true
}

/**
 * Joyride dashboard tour, "Show me around" button, tutorial cards.
 * Only enabled in development until tour is stable (Code April).
 */
export function isTourEnabled(): boolean {
  return process.env.NODE_ENV === 'development'
}
