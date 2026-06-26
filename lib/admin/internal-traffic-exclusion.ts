export {
  EXCLUDED_EMAILS,
  EXCLUDED_USER_IDS,
  isExcludedAdminEmail,
  isExcludedAdminUserId,
  isExcludedFromAdminAnalytics,
} from '@/lib/admin/tracking'

/** Paths that should never count as marketing traffic. */
export function isInternalTrafficPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') return false
  const p = path.split('?')[0]?.trim() || path
  return p.startsWith('/admin') || p.startsWith('/api/')
}

export const INTERNAL_TRAFFIC_EXCLUSION_NOTE =
  'Excluded from counts: founder/team admin accounts, /admin pages, and localhost dev traffic. Sign in as admin on production for clean numbers; logged-out/incognito tests or old rows may still appear briefly.'
