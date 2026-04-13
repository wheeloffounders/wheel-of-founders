/** No “loop open” banner on these routes */
export const MORNING_BANNER_SUPPRESSED_PREFIXES = [
  '/morning',
  '/onboarding',
  '/auth',
  '/emergency',
  '/login',
  '/signup',
  '/countdown',
  '/pricing',
  '/help',
  '/privacy',
  '/terms',
  '/about',
  '/checkout',
  '/duo',
  '/design-system',
  '/dev',
  '/test',
  '/sentry-example-page',
  '/video-templates',
  '/pricing-disabled',
  '/admin',
  '/feedback',
] as const

/**
 * Browse-mode lock: blurred/light-dim overlay until today’s morning plan is committed.
 * Emergency is intentionally excluded (full triage). Dashboard stays fully usable with banner only.
 */
export const MORNING_PREVIEW_OVERLAY_PREFIXES = [
  '/founder-dna',
  '/profile',
  '/settings',
  '/weekly',
  '/history',
  '/monthly-insight',
  '/quarterly',
  '/insights',
  '/trajectory',
] as const

export function shouldSuppressMorningLoopBanner(pathname: string | null): boolean {
  if (!pathname) return true
  if (pathname === '/') return true
  return MORNING_BANNER_SUPPRESSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function shouldShowMorningPreviewOverlay(pathname: string | null, isMorningPlanIncomplete: boolean): boolean {
  if (!isMorningPlanIncomplete || !pathname) return false
  if (shouldSuppressMorningLoopBanner(pathname)) return false
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return false
  return MORNING_PREVIEW_OVERLAY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function previewPageLabel(pathname: string | null): string {
  if (!pathname) return 'this page'
  if (pathname.startsWith('/founder-dna')) return 'Founder DNA'
  if (pathname.startsWith('/profile')) return 'Profile'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/weekly')) return 'Weekly'
  if (pathname.startsWith('/history')) return 'History'
  if (pathname.startsWith('/monthly-insight')) return 'Monthly insight'
  if (pathname.startsWith('/quarterly')) return 'Quarterly'
  if (pathname.startsWith('/insights')) return 'Insights'
  if (pathname.startsWith('/trajectory')) return 'Trajectory'
  return 'this area'
}
