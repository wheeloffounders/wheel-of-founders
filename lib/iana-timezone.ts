/** Validate IANA name before persisting to `user_profiles.timezone`. */
export function isValidIanaTimeZone(tz: string): boolean {
  const s = String(tz ?? '').trim()
  if (!s) return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s })
    return true
  } catch {
    return false
  }
}
