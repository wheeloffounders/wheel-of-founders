/**
 * Derive coarse device class from a User-Agent string (admin analytics / coach layer).
 */
export function parseDeviceType(ua: string): 'Mobile' | 'Tablet' | 'Desktop' {
  const u = ua.trim()
  if (!u) return 'Desktop'
  if (/ipad|tablet/i.test(u)) return 'Tablet'
  if (/mobile|iphone|android/i.test(u)) return 'Mobile'
  return 'Desktop'
}

export function userAgentFromPageViewRow(
  row: { user_agent?: string | null; metadata?: unknown } | null | undefined
): string | null {
  if (!row) return null
  if (typeof row.user_agent === 'string' && row.user_agent.trim()) return row.user_agent.trim()
  const m = row.metadata
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    const v = (m as Record<string, unknown>).user_agent
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}
