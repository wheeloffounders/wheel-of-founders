export type SessionAttributionSource = 'direct' | 'calendar' | 'email' | 'push'

const UTM_TO_SOURCE: Record<string, SessionAttributionSource> = {
  calendar: 'calendar',
  email: 'email',
  push: 'push',
  direct: 'direct',
}

/**
 * Map `utm_source` (lowercase) to a stored session source. Returns null if unknown / absent.
 */
export function sessionSourceFromUtm(utmSource: string | null | undefined): SessionAttributionSource | null {
  if (!utmSource || typeof utmSource !== 'string') return null
  const k = utmSource.trim().toLowerCase()
  return UTM_TO_SOURCE[k] ?? null
}
