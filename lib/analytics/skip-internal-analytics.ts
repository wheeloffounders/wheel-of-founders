import { isWhitelistAdminEmail } from '@/lib/admin-emails'

let cachedSkip: boolean | null = null
let cacheExpiresAt = 0
const CACHE_MS = 60_000

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])

/** True for local dev hostnames (localhost, 127.0.0.1, etc.). */
export function isLocalhostHostname(hostname: string | null | undefined): boolean {
  if (!hostname || typeof hostname !== 'string') return false
  const h = hostname.trim().toLowerCase()
  if (LOCALHOST_HOSTS.has(h)) return true
  if (h.endsWith('.localhost')) return true
  return false
}

/** Client: skip telemetry when the app runs on localhost. */
export function isLocalhostClient(): boolean {
  if (typeof window === 'undefined') return false
  return isLocalhostHostname(window.location.hostname)
}

/** Server: skip when request Host (or forwarded host) is localhost. */
export function isLocalhostRequest(req: Request): boolean {
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host')?.split(':')[0]?.trim() ||
    ''
  return isLocalhostHostname(host)
}

/** Referrer URL or path hint that points at local dev (for report filtering). */
export function isLocalhostReferrer(referrer: string | null | undefined): boolean {
  if (!referrer || typeof referrer !== 'string') return false
  const r = referrer.trim().toLowerCase()
  if (!r) return false
  return (
    r.includes('://localhost') ||
    r.includes('://127.0.0.1') ||
    r.includes('://[::1]') ||
    r.includes('://0.0.0.0')
  )
}

/**
 * Skip Radar / page-view telemetry for founder & team accounts (same allowlist as admin)
 * and for localhost (local dev only — not real visitor traffic).
 */
export async function shouldSkipInternalAnalytics(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (isLocalhostClient()) return true

  const now = Date.now()
  if (cachedSkip !== null && now < cacheExpiresAt) return cachedSkip

  try {
    const { getUserSession } = await import('@/lib/auth')
    const session = await getUserSession()
    const skip =
      Boolean((session?.user as { is_admin?: boolean } | undefined)?.is_admin) ||
      isWhitelistAdminEmail(session?.user?.email)
    cachedSkip = skip
    cacheExpiresAt = now + CACHE_MS
    return skip
  } catch {
    cachedSkip = false
    cacheExpiresAt = now + CACHE_MS
    return false
  }
}

/** Admin tools and preview routes should never count as marketing traffic. */
export function isInternalAnalyticsPath(path: string): boolean {
  const p = path.split('?')[0] || path
  return p.startsWith('/admin') || p.startsWith('/api/')
}

export function invalidateInternalAnalyticsCache(): void {
  cachedSkip = null
  cacheExpiresAt = 0
}
