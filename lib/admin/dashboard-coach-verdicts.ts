import type { FounderJourneyCommandCenterPayload, MomentumFunnelStage } from '@/lib/admin/tracking'

type PulsePoint = FounderJourneyCommandCenterPayload['pulse']['points'][number]

function mean(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0
  const m = mean(nums)
  return Math.sqrt(mean(nums.map((x) => (x - m) ** 2)))
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return 0
  const sx = xs.slice(0, n)
  const sy = ys.slice(0, n)
  const mx = mean(sx)
  const my = mean(sy)
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const vx = sx[i]! - mx
    const vy = sy[i]! - my
    num += vx * vy
    dx += vx * vx
    dy += vy * vy
  }
  const den = Math.sqrt(dx * dy)
  return den === 0 ? 0 : num / den
}

/** User pulse scatter — engagement vs days since signup. */
export function coachVerdictPulse(points: PulsePoint[]): string | null {
  if (points.length === 0) return null
  const scores = points.map((p) => p.engagementScore)
  const days = points.map((p) => p.daysSinceSignup)
  const avgEng = mean(scores)
  const avgDays = mean(days)
  const daySpan = Math.max(...days) - Math.min(...days)
  const engStd = stdev(scores)
  const r = pearson(days, scores)

  const sentences: string[] = []

  if (avgEng < 40 && avgDays > 7 && points.length >= 2) {
    sentences.push(
      'Users are “Lurking,” not “Living.” They are doing the bare minimum but haven’t integrated the app into their core routine.'
    )
  }

  const horizontalBand =
    points.length >= 3 &&
    daySpan >= 12 &&
    engStd <= 10 &&
    Math.abs(r) < 0.25 &&
    avgEng < 65

  if (horizontalBand) {
    sentences.push(
      'Plateau alert: dots cluster horizontally—consistent presence but little deepening into richer loops and features.'
    )
  }

  if (sentences.length === 0) return null
  return sentences.join(' ')
}

export function coachVerdictFunnel(funnel: MomentumFunnelStage[]): string | null {
  const onboarded = funnel.find((s) => s.id === 'onboarded')?.count ?? 0
  const firstM = funnel.find((s) => s.id === 'first_morning')?.count ?? 0
  const firstE = funnel.find((s) => s.id === 'first_evening')?.count ?? 0
  const parts: string[] = []

  if (firstM > 0 && firstE === 0) {
    parts.push(
      'The Insight Ghost is active: users get morning value then vanish—we need a stronger evening “Harvest” hook.'
    )
  }

  if (onboarded > 0 && firstM / onboarded < 0.5) {
    parts.push('Onboarding friction: over half of signups never reach a first morning save—inspect the path to first plan.')
  }

  if (parts.length === 0) return null
  return parts.join(' ')
}

export function coachVerdictRetention(
  rows: FounderJourneyCommandCenterPayload['retentionByShadow']
): string | null {
  const labeled = rows.filter((r) => r.cohortUsers > 0)
  if (labeled.length < 2) return null
  const zeros = labeled.filter((r) => r.retentionPct === 0)
  const positives = labeled.filter((r) => r.retentionPct > 0)
  if (zeros.length === 0 || positives.length === 0) return null
  const names = zeros.map((z) => z.shadow).join(', ')
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const pretty = names
    .split(', ')
    .map((n) => cap(n))
    .join(', ')
  return `Archetype mismatch: ${pretty} show 0% last-7d activity while other shadows retain—the value prop may not be landing for that mindset.`
}

export function coachVerdictEmergency(
  emergency: FounderJourneyCommandCenterPayload['emergency']
): string | null {
  if (emergency.visitedEmergency === 0) {
    return 'No /emergency visits in this window—trust % is a placeholder until real crisis traffic shows up.'
  }
  if (emergency.trustLeak) {
    return 'Trust leak flagged: too many emergency visits end without a clear saved next step—tighten the containment bridge.'
  }
  if (emergency.visitedEmergency >= 3 && emergency.ratePct < 35) {
    return 'Emergency rescue rate is soft—make “save next step” the obvious win before users bounce.'
  }
  return null
}

export function coachVerdictCohort(onboardedCount: number): string | null {
  if (onboardedCount === 0) {
    return 'No signups in this date window—widen the range or confirm profile creation is firing.'
  }
  if (onboardedCount < 6) {
    return 'Tiny cohort—read every dot as a story; percentages will swing hard with one person.'
  }
  return null
}

export function coachVerdictFriction(avgPost: number | null): string | null {
  if (avgPost == null) return null
  if (avgPost >= 2) {
    return 'Postponement density is high—plans may feel heavier than execution capacity; watch task load and snooze patterns.'
  }
  return null
}

/** Pulse-batch device mix: handheld = Mobile + Tablet (last known User-Agent per user). */
export function coachVerdictDevice(
  mix: FounderJourneyCommandCenterPayload['deviceMix'] | null | undefined
): string | null {
  if (!mix || mix.knownCount < 3) return null
  if (mix.handheldPct > 75) {
    return 'Mobile-First User Base. Your recent UX cleanup (Task Stacking/Firefighter) was critical—this cohort is almost entirely hand-held.'
  }
  return null
}
