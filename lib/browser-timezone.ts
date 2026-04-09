'use client'

/** Browser IANA zone (e.g. `Asia/Hong_Kong`) for syncing to `user_profiles.timezone`. */
export function getBrowserIanaTimeZone(): string | null {
  if (typeof Intl === 'undefined') return null
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone
    return typeof z === 'string' && z.length > 0 ? z : null
  } catch {
    return null
  }
}
