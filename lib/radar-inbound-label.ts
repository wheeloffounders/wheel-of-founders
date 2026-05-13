/**
 * Shared first-touch label for Founder Radar (no browser APIs).
 * Prefer utm_source; else external-referrer hostname; else direct.
 */
export function deriveInboundTouchLabel(input: {
  utm_source?: string | null
  referrer?: string | null
}): string {
  const u = typeof input.utm_source === 'string' ? input.utm_source.trim().toLowerCase() : ''
  if (u.length > 0) return u.slice(0, 128)
  const ref = typeof input.referrer === 'string' ? input.referrer.trim() : ''
  if (!ref) return 'direct'
  try {
    return new URL(ref).hostname.replace(/^www\./i, '').toLowerCase().slice(0, 128)
  } catch {
    return 'referrer'
  }
}
