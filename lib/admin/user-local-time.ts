import { formatInTimeZone } from 'date-fns-tz'

/** 12-hour clock in user's zone, e.g. `2:45 PM` (for admin "what time is it for them now"). */
export function formatUserLocalClock(isoOrNow: Date, ianaTz: string): string {
  return formatInTimeZone(isoOrNow, ianaTz, 'h:mm a')
}

/** Full date+time in user's zone for timeline columns (signup, first save). */
export function formatUserLocalDateTime(iso: string, ianaTz: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return formatInTimeZone(d, ianaTz, 'MMM d, yyyy h:mm a')
}

/** Local hour 0–23 for an instant in `ianaTz`. */
export function getLocalHour(iso: string, ianaTz: string): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const h = parseInt(formatInTimeZone(d, ianaTz, 'H'), 10)
  return Number.isFinite(h) ? h : null
}

/**
 * Velocity looks like "signed off at night, morning save" rather than procrastination.
 * Rules: gap &gt; 6h, crossed a local calendar day, signup in 10 PM–7:59 AM local, first save ~5–9:59 AM local.
 */
export function isNaturalOvernightVelocityGap(input: {
  signupIso: string
  firstCommitIso: string
  minutes: number
  ianaTz: string
}): boolean {
  if (input.minutes <= 360) return false
  const t0 = new Date(input.signupIso)
  const t1 = new Date(input.firstCommitIso)
  if (Number.isNaN(t0.getTime()) || Number.isNaN(t1.getTime())) return false
  if (t1.getTime() <= t0.getTime()) return false

  const signupDay = formatInTimeZone(t0, input.ianaTz, 'yyyy-MM-dd')
  const commitDay = formatInTimeZone(t1, input.ianaTz, 'yyyy-MM-dd')
  if (commitDay <= signupDay) return false

  const hs = getLocalHour(input.signupIso, input.ianaTz)
  const hc = getLocalHour(input.firstCommitIso, input.ianaTz)
  if (hs == null || hc == null) return false

  const signupInSleepWindow = hs >= 22 || hs < 8
  const commitMorning = hc >= 5 && hc < 10
  return signupInSleepWindow && commitMorning
}
