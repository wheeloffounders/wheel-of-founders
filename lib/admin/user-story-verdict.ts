import type { FlowPathStep } from '@/lib/admin/flow-path-tags'
import { formatMinutesToFirstMorning } from '@/lib/admin/flow-path-tags'
import { isNaturalOvernightVelocityGap } from '@/lib/admin/user-local-time'

/** Minimal row shape for admin Sample Users + strategic advisor “user stories”. */
export type AdminPulseUserStorySignal = {
  userId: string
  shadow: string
  lastDevice: string
  recentPath: FlowPathStep[]
  minutesToFirstMorningSave: number | null
  calendarHook: boolean
  engagementScore: number
  daysSinceSignup: number
  /** IANA zone from profile (for overnight velocity). */
  profileTimezone?: string
  /** Profile `created_at` ISO. */
  profileCreatedAtIso?: string | null
  /** First `morning_plan_commits.committed_at` ISO. */
  firstMorningCommittedAtIso?: string | null
}

function shouldTreatAsNaturalOvernight(signal: AdminPulseUserStorySignal, mins: number): boolean {
  const tz = signal.profileTimezone
  const su = signal.profileCreatedAtIso
  const co = signal.firstMorningCommittedAtIso
  if (!tz || !su || !co) return false
  return isNaturalOvernightVelocityGap({
    signupIso: su,
    firstCommitIso: co,
    minutes: mins,
    ianaTz: tz,
  })
}

/**
 * One-sentence “Deer verdict” for a pulse-batch row (path, velocity, device, hook).
 * Rule-based; safe for client admin UI and LLM prompts.
 */
export function generateUserStory(signal: AdminPulseUserStorySignal): string {
  const handheld = signal.lastDevice === 'Mobile' || signal.lastDevice === 'Tablet'
  const path = signal.recentPath ?? []
  const last = path.length > 0 ? path[path.length - 1]! : null
  const mins = signal.minutesToFirstMorningSave
  const bypassN = path.filter((s) => s.bypassed).length
  const velLabel = mins != null ? formatMinutesToFirstMorning(mins) : null

  if (
    mins != null &&
    mins > 360 &&
    shouldTreatAsNaturalOvernight(signal, mins)
  ) {
    return 'Natural Overnight Gap. Signed up at night, returned for morning ritual.'
  }

  if (mins != null && mins > 120 && handheld) {
    return 'Onboarding was a struggle on mobile; likely multitasking.'
  }

  if (last?.tag === 'Morning' && last.dwellSeconds != null && last.dwellSeconds > 60) {
    return 'Deeply engaged with morning planning; at risk of the Insight Ghost tonight if evening never lands.'
  }

  if (path.length >= 3 && bypassN >= 2) {
    return 'Several quick exits in a row—pages may feel like a wall; shorten copy or reduce steps on first visits.'
  }

  if (last?.tag === 'Evening') {
    return 'Reached evening—closed-loop signal; keep reinforcing the harvest habit.'
  }

  if (last?.tag === 'Emergency') {
    return 'Recently in Firefighter mode—stress path; containment and calm UX matter here.'
  }

  if (last?.tag === 'DNA' && last.dwellSeconds != null && last.dwellSeconds > 45) {
    return 'Dwelling on Founder DNA—identity and narrative are landing; support with light next steps.'
  }

  if (mins != null && mins <= 5 && signal.engagementScore >= 35) {
    return 'Very fast first morning save with strong engagement—high-momentum starter worth watching for depth vs burnout.'
  }

  if (mins != null && mins >= 60 && signal.shadow === 'strategist') {
    return 'Strategist pace: slower first commit but deliberate—prefer depth prompts over nagging reminders.'
  }

  if (signal.calendarHook && (mins == null || mins <= 240)) {
    return 'Calendar synced early—#1 high-intent hook; treat as integrating the app into a real schedule.'
  }

  if (mins != null && mins >= 480 && !shouldTreatAsNaturalOvernight(signal, mins)) {
    return `Took ${velLabel ?? 'many hours'} to first morning save—long runway before commitment; watch for evening ghosting.`
  }

  if (handheld && signal.engagementScore < 25 && path.length > 0) {
    return 'Light engagement on a handheld device—favor short paragraphs, bold headers, and obvious primary actions.'
  }

  const hook = signal.calendarHook ? 'Calendar hooked—strong commitment signal. ' : ''
  const arch = `${signal.shadow.charAt(0).toUpperCase()}${signal.shadow.slice(1)}-leaning`
  const vel =
    velLabel != null
      ? `First save ${velLabel} after signup.`
      : 'No first morning save timestamp yet in this cohort window.'
  return `${hook}${arch}; day ${signal.daysSinceSignup} since signup. ${vel} Engagement score ${signal.engagementScore}.`.trim()
}
