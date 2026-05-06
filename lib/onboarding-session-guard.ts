/**
 * Client-only onboarding “breakout”: lets founders reach hub routes in this tab without a Skip button.
 * Clears when the tab closes (sessionStorage).
 */
export const WOF_ONBOARDING_PAUSED_SESSION_KEY = 'onboarding_paused'

export function pauseOnboardingForThisSession(): void {
  try {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(WOF_ONBOARDING_PAUSED_SESSION_KEY, 'true')
  } catch {
    // private mode / quota
  }
}

export function isOnboardingPausedThisSession(): boolean {
  try {
    return typeof window !== 'undefined' && sessionStorage.getItem(WOF_ONBOARDING_PAUSED_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export function hasSkipInitialOnboardingCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some((c) => c === 'skip_initial_onboarding=true')
}

/**
 * Paths where we do not force `/onboarding/goal` for incomplete accounts (core loop + marketing + onboarding).
 */
export function shouldBypassOnboardingSessionGate(pathname: string | null): boolean {
  if (!pathname) return true
  if (pathname === '/') return true

  const prefixes = [
    '/auth',
    '/login',
    '/countdown',
    '/onboarding',
    '/pricing',
    '/blog',
    '/templates',
    '/help',
    '/privacy',
    '/terms',
    '/about',
    '/emergency',
    '/morning',
    '/evening',
    '/today',
    '/api',
    '/_next',
    '/sentry-example-page',
    '/dev',
    '/design-system',
    '/admin',
  ] as const

  for (const p of prefixes) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return true
  }
  return false
}
