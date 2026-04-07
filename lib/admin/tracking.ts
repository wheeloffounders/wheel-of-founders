/**
 * Momentum-based admin metrics: shadow archetype (early signal), loop completion,
 * funnel milestones, and contextual "Deer advice" for the Command Center.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, differenceInCalendarDays, format, formatDistanceToNow, subDays, subHours } from 'date-fns'
import type { FlowPathStep } from '@/lib/admin/flow-path-tags'
import { minutesBetweenIso } from '@/lib/admin/flow-path-tags'
import { fetchRecentPathLabelsForUsers } from '@/lib/admin/recent-path-from-page-views'
import { parseDeviceType } from '@/lib/admin/parse-device-type'
import { fetchLatestUserAgentsForUsers } from '@/lib/admin/latest-page-view-user-agents'
import { formatUserLocalClock, formatUserLocalDateTime, getLocalHour } from '@/lib/admin/user-local-time'
import { getUserTimezoneFromProfile } from '@/lib/timezone'

/** Internal / family accounts excluded from admin cohort analytics. */
export const EXCLUDED_EMAILS = ['sniclam@gmail.com', 'vanieho@hotmail.com', 'wttmotivation@gmail.com'] as const

/**
 * Profile IDs excluded even when `user_profiles.email` is null or stale vs auth.
 * (Email-only filter misses rows where email was never copied to the profile.)
 */
export const EXCLUDED_USER_IDS = ['9f8ac7f6-6036-4f50-8133-dbb9eecd5765'] as const

export function isExcludedAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  const e = email.trim().toLowerCase()
  return (EXCLUDED_EMAILS as readonly string[]).includes(e)
}

export function isExcludedAdminUserId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false
  const normalized = id.trim().toLowerCase()
  return (EXCLUDED_USER_IDS as readonly string[]).includes(normalized)
}

/** Cohort + pulse + funnel: exclude by profile id or email. */
export function isExcludedFromAdminAnalytics(user: { id: string; email?: string | null }): boolean {
  if (isExcludedAdminUserId(user.id)) return true
  return isExcludedAdminEmail(user.email)
}

export type ShadowArchetypeName = 'visionary' | 'builder' | 'hustler' | 'strategist' | 'hybrid'

export type ShadowArchetypeResult = {
  label: ShadowArchetypeName
  scores: {
    visionary: number
    builder: number
    hustler: number
    strategist: number
  }
  inputs: {
    whyWordCount: number
    taskCompletionRate: number
    strategicCount: number
    tacticalCount: number
    eveningStressAvg: number | null
    eveningsSampled: number
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

function wordCount(s: string | null | undefined): number {
  if (!s || typeof s !== 'string') return 0
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Evening distress proxy: 0 = calm, 1 = high severity (low mood/energy). */
export function eveningStressFromMoodEnergy(mood: number | null, energy: number | null): number | null {
  if (mood == null && energy == null) return null
  const m = mood ?? 3
  const e = energy ?? 3
  const distress = ((5 - m) + (5 - e)) / 2
  return clamp(distress / 4, 0, 1)
}

/**
 * Shadow scorer (days 1–20 window approximated by first 3 calendar days from signup).
 * Metric A: why-word volume vs task completion → Visionary vs Builder.
 * Metric B: evening stress vs strategic decision share → Hustler vs Strategist.
 */
export function computeShadowArchetype(input: {
  whyTexts: string[]
  tasksTotal: number
  tasksCompleted: number
  strategicCount: number
  tacticalCount: number
  eveningMoodEnergy: Array<{ mood: number | null; energy: number | null }>
}): ShadowArchetypeResult {
  const whyWordCount = input.whyTexts.reduce((sum, t) => sum + wordCount(t), 0)
  const tasksTotal = Math.max(0, input.tasksTotal)
  const tasksCompleted = Math.max(0, input.tasksCompleted)
  const taskCompletionRate = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0

  const s = input.strategicCount
  const t = input.tacticalCount
  const totalDec = s + t
  const strategicPct = totalDec > 0 ? s / totalDec : 0.5

  let stressSum = 0
  let stressN = 0
  for (const row of input.eveningMoodEnergy) {
    const st = eveningStressFromMoodEnergy(row.mood, row.energy)
    if (st != null) {
      stressSum += st
      stressN += 1
    }
  }
  const eveningStressAvg = stressN > 0 ? stressSum / stressN : null
  const stressNorm = eveningStressAvg ?? 0.5

  const whyNorm = clamp(whyWordCount / 420, 0, 1)
  const visionaryScore = clamp(0.55 * whyNorm + 0.45 * (1 - taskCompletionRate), 0, 1)
  const builderScore = clamp(0.58 * taskCompletionRate + 0.42 * (1 - whyNorm), 0, 1)

  const hustlerScore = clamp(0.52 * stressNorm + 0.48 * (1 - strategicPct), 0, 1)
  const strategistScore = clamp(0.52 * (1 - stressNorm) + 0.48 * strategicPct, 0, 1)

  const scores = { visionary: visionaryScore, builder: builderScore, hustler: hustlerScore, strategist: strategistScore }
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const top = entries[0]!
  const second = entries[1]!
  const label: ShadowArchetypeName =
    top[1] - second[1] < 0.12 ? 'hybrid' : (top[0] as ShadowArchetypeName)

  return {
    label,
    scores: {
      visionary: Math.round(visionaryScore * 1000) / 1000,
      builder: Math.round(builderScore * 1000) / 1000,
      hustler: Math.round(hustlerScore * 1000) / 1000,
      strategist: Math.round(strategistScore * 1000) / 1000,
    },
    inputs: {
      whyWordCount,
      taskCompletionRate: Math.round(taskCompletionRate * 1000) / 1000,
      strategicCount: s,
      tacticalCount: t,
      eveningStressAvg: eveningStressAvg != null ? Math.round(eveningStressAvg * 1000) / 1000 : null,
      eveningsSampled: stressN,
    },
  }
}

/** True if same calendar day has both a morning save and a non-draft evening completion signal. */
export function dayHasClosedLoop(input: {
  morningDates: Set<string>
  eveningDates: Set<string>
}): boolean {
  for (const d of input.morningDates) {
    if (input.eveningDates.has(d)) return true
  }
  return false
}

export type MomentumFunnelStage = {
  id: string
  label: string
  count: number
  pctOfPrevious: number | null
}

export type DeerAdviceItem = {
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
}

export function buildDeerAdviceFromFunnel(stages: MomentumFunnelStage[]): DeerAdviceItem[] {
  const advice: DeerAdviceItem[] = []
  const onboarded = stages.find((s) => s.id === 'onboarded')
  const firstEvening = stages.find((s) => s.id === 'first_evening')
  const streak3 = stages.find((s) => s.id === 'streak_3')
  const firstMorning = stages.find((s) => s.id === 'first_morning')
  const badgeTier1 = stages.find((s) => s.id === 'badge_tier_1')

  if (onboarded && firstMorning && onboarded.count > 0) {
    const dropMorning = 1 - firstMorning.count / onboarded.count
    if (dropMorning > 0.45) {
      advice.push({
        severity: 'warning',
        title: 'Onboarding friction',
        body: 'Many accounts never save a first morning plan. Shorten the path to the first “Save”, or add a one-tap example plan they can edit.',
      })
    }
  }

  if (firstMorning && firstEvening && firstMorning.count > 0) {
    const dropEvening = 1 - firstEvening.count / firstMorning.count
    if (dropEvening > 0.8) {
      advice.push({
        severity: 'critical',
        title: 'The Insight Ghost',
        body: 'Most users who save a morning plan never log a first evening — the “aha” from insights may feel like an exit, not a hook. Reframe the evening as harvesting the reward (wins, closure, momentum) instead of another form to complete; add a single-tap “bank the day” path tied to what they already saw in the morning.',
      })
    } else if (dropEvening > 0.5) {
      advice.push({
        severity: 'critical',
        title: 'The reward gap (morning → first evening)',
        body: 'The Evening Hook may be failing: users are not saving a first evening reflection. Surface First Glimpse value faster (shorter evening v1, dashboard teaser, or a single “close the loop” nudge after morning save).',
      })
    }
  }

  if (firstEvening && streak3 && firstEvening.count > 0) {
    const dropStreak = 1 - streak3.count / firstEvening.count
    if (dropStreak > 0.55) {
      advice.push({
        severity: 'warning',
        title: 'The patience gap',
        body: 'Momentum fades before a 3-day streak. Consider a visible micro-badge and a “Rhythm” teaser so the climb feels shorter.',
      })
    }
  }

  if (streak3 && badgeTier1 && streak3.count > 0) {
    const dropBadge = 1 - badgeTier1.count / streak3.count
    if (dropBadge > 0.6) {
      advice.push({
        severity: 'warning',
        title: 'Badge tier gap',
        body: 'Users who reach a 3-day streak are slow to earn Badge Tier 1. Audit first_spark / first unlock conditions and make the win visible the day they qualify.',
      })
    }
  }

  if (advice.length === 0) {
    advice.push({
      severity: 'info',
      title: 'Loops look healthy',
      body: 'No single stage is spiking past thresholds. Keep monitoring shadow splits so copy stays balanced for Hustlers vs Visionaries.',
    })
  }

  return advice
}

export type PulseActivityByHourUtc = Array<{
  hour: number
  total: number
  byShadow: Partial<Record<ShadowArchetypeName, number>>
}>

/** Cohort-wide counts of users with each shadow label (first 3 days of signal). */
export type ShadowDistribution = Record<ShadowArchetypeName, number>

export function buildShadowSummary(dist: ShadowDistribution): string {
  const total = Object.values(dist).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return 'No shadow labels yet — users need activity in the first 3 calendar days of signal.'
  }
  const entries = (Object.entries(dist) as [ShadowArchetypeName, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const dominant = entries[0]!
  const mix = entries.map(([k, v]) => `${k}: ${v}`).join(', ')
  return `Labeled cohort: ${total} user(s). Mix: ${mix}. Dominant: ${dominant[0]} (${dominant[1]}).`
}

export type FounderJourneyCommandCenterPayload = {
  generatedAt: string
  /** Inclusive cohort window by signup date (yyyy-MM-dd). */
  dateRangeStart: string
  dateRangeEnd: string
  funnel: MomentumFunnelStage[]
  deerAdvice: DeerAdviceItem[]
  /** Full-cohort shadow mix (who earned a label in the first 3-day signal window). */
  shadowDistribution: ShadowDistribution
  /** One-line summary for AI prompts (cohort archetype mix). */
  shadowSummary: string
  pulse: {
    points: Array<{
      userId: string
      email: string | null
      shadow: ShadowArchetypeName
      daysSinceSignup: number
      engagementScore: number
      /** Human-readable last meaningful save in cohort window (from row timestamps). */
      lastAction: string
      /**
       * Last few `page_views` steps (oldest → newest): flow tag + dwell seconds to next view.
       * `bypassed` when dwell &lt; 5s (likely skimmed).
       */
      recentPath: FlowPathStep[]
      /** True if user has an active ICS subscription and/or Google Calendar OAuth (voluntary calendar hook). */
      calendarHook: boolean
      /** Minutes from profile `created_at` to first `morning_plan_commits.committed_at`; null if never saved. */
      minutesToFirstMorningSave: number | null
      /** Parsed from most recent `page_views.user_agent` (pulse batch). */
      lastDevice: string
      /** IANA zone from profile (UTC if unset/invalid). */
      profileTimezone: string
      /** Their wall-clock time when the dashboard payload was built. */
      userLocalTime: string
      /** Profile `created_at` formatted in `profileTimezone` (signup “born” moment). */
      signupBornLocal: string
      /** First morning plan commit in `profileTimezone`, or empty if none. */
      firstMorningStartedLocal: string
      /** Local hour (0–23) at profile creation. */
      signupLocalHour: number | null
      /** ISO timestamp of first morning plan commit (for overnight velocity context). */
      firstMorningCommittedAt: string | null
      /** Profile `created_at` ISO (for overnight velocity vs ghosting). */
      profileCreatedAt: string
    }>
    shadowLegend: Array<{ shadow: ShadowArchetypeName; color: string }>
    /** Count of pulse-batch users per shadow (scatter subset; may differ from cohort shadowDistribution). */
    shadowDistribution?: ShadowDistribution
    /** UTC hour buckets (0–23) for page_views in last 24h among pulse-batch users only. */
    activityByHourUtc?: PulseActivityByHourUtc
  }
  retentionByShadow: Array<{
    shadow: ShadowArchetypeName
    cohortUsers: number
    activeLast7d: number
    retentionPct: number
  }>
  emergency: {
    visitedEmergency: number
    withNextStep: number
    ratePct: number
    trustLeak: boolean
  }
  sensors: {
    avgPostponementsPerUser: number | null
    ttvInsightSecondsMedian: number | null
    ttvNote: string | null
  }
  /** Pulse-batch sample: handheld (Mobile + Tablet) vs Desktop among users with a stored User-Agent. */
  deviceMix: {
    handheldPct: number
    desktopPct: number
    knownCount: number
    unknownCount: number
  }
  sampleNote: string | null
}

/**
 * 0–100 engagement index from in-window activity (tasks, evenings, decisions).
 * For small cohorts (fewer than 10 users), uses linear “absolute” points so a few tasks don’t collapse to a tiny log score.
 */
export function computeEngagementScore(
  mt: number,
  ev: number,
  dec: number,
  options?: { cohortSize?: number }
): number {
  const cohortSize = options?.cohortSize ?? Infinity
  const sum = mt * 2 + ev * 3 + dec * 1.5
  if (cohortSize < 10) {
    const raw = mt * 10 + ev * 14 + dec * 7
    return Math.min(100, Math.round(raw))
  }
  return Math.min(100, Math.round(28 * Math.log10(10 + sum)))
}

type MorningRow = {
  plan_date: string
  description?: string
  why_this_matters?: string
  completed?: boolean
  updated_at?: string | null
}
type DecisionRow = { plan_date: string; decision_type?: string; updated_at?: string | null }
type EveningRow = {
  review_date: string
  mood?: number
  energy?: number
  is_draft?: boolean
  updated_at?: string | null
}

function formatLastActionLabel(
  uid: string,
  morningByUser: Map<string, MorningRow[]>,
  decisionsByUser: Map<string, DecisionRow[]>,
  eveningByUser: Map<string, EveningRow[]>
): string {
  let bestTime = 0
  let bestLabel = ''
  const bump = (iso: string | null | undefined, label: string) => {
    if (!iso) return
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return
    if (t > bestTime) {
      bestTime = t
      bestLabel = label
    }
  }
  for (const t of morningByUser.get(uid) ?? []) {
    bump(t.updated_at ?? undefined, 'Morning plan')
  }
  for (const d of decisionsByUser.get(uid) ?? []) {
    bump(d.updated_at ?? undefined, 'Decision log')
  }
  for (const e of eveningByUser.get(uid) ?? []) {
    bump(e.updated_at ?? undefined, e.is_draft ? 'Evening draft' : 'Evening reflection')
  }
  if (!bestLabel) return 'No saves in cohort window'
  return `${bestLabel} · ${formatDistanceToNow(new Date(bestTime), { addSuffix: true })}`
}

const SHADOW_COLORS: Record<ShadowArchetypeName, string> = {
  visionary: '#6366f1',
  builder: '#10b981',
  hustler: '#ef725c',
  strategist: '#152b50',
  hybrid: '#a855f7',
}

function firstThreeCalendarDaysFromSignup(signupIso: string): { d0: string; d1: string; d2: string } {
  const d = new Date(signupIso)
  if (Number.isNaN(d.getTime())) {
    const today = format(new Date(), 'yyyy-MM-dd')
    return { d0: today, d1: today, d2: today }
  }
  const start = format(d, 'yyyy-MM-dd')
  return {
    d0: start,
    d1: format(addDays(new Date(start + 'T12:00:00.000Z'), 1), 'yyyy-MM-dd'),
    d2: format(addDays(new Date(start + 'T12:00:00.000Z'), 2), 'yyyy-MM-dd'),
  }
}

function maxStreakDays(dates: string[]): number {
  const sorted = [...new Set(dates)].sort()
  if (sorted.length === 0) return 0
  let best = 1
  let cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1]! + 'T12:00:00Z')
    const b = new Date(sorted[i]! + 'T12:00:00Z')
    const diffDays = Math.round((b.getTime() - a.getTime()) / 86400000)
    if (diffDays === 1) cur++
    else cur = 1
    best = Math.max(best, cur)
  }
  return best
}

export type BuildCommandCenterOptions = {
  pulseUserCap?: number
  /** Inclusive yyyy-MM-DD. Takes precedence over cohortDays when both endDate and startDate are set. */
  startDate?: string
  endDate?: string
  /** Fallback when startDate/endDate omitted: last N days ending today (7–365). */
  cohortDays?: number
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function resolveCommandCenterDateRange(options: BuildCommandCenterOptions): {
  startIso: string
  endIso: string
  startDateStr: string
  endDateStr: string
} {
  if (options.startDate && options.endDate) {
    const s = options.startDate.slice(0, 10)
    const e = options.endDate.slice(0, 10)
    if (!YMD_RE.test(s) || !YMD_RE.test(e)) {
      throw new Error('startDate and endDate must be yyyy-MM-dd')
    }
    if (s > e) {
      throw new Error('startDate must be on or before endDate')
    }
    return {
      startIso: `${s}T00:00:00.000Z`,
      endIso: `${e}T23:59:59.999Z`,
      startDateStr: s,
      endDateStr: e,
    }
  }
  const cohortDays = Math.min(Math.max(options.cohortDays ?? 90, 7), 365)
  const endD = new Date()
  const endDateStr = format(endD, 'yyyy-MM-dd')
  const startDateStr = format(subDays(endD, cohortDays), 'yyyy-MM-dd')
  return {
    startIso: `${startDateStr}T00:00:00.000Z`,
    endIso: `${endDateStr}T23:59:59.999Z`,
    startDateStr,
    endDateStr,
  }
}

/**
 * Aggregates momentum funnel, shadow labels, pulse scatter, retention slices, emergency trust.
 * Uses service-role client (bypass RLS).
 */
export async function buildFounderJourneyCommandCenter(
  db: SupabaseClient,
  options: BuildCommandCenterOptions = {}
): Promise<FounderJourneyCommandCenterPayload> {
  const { startIso, endIso, startDateStr, endDateStr } = resolveCommandCenterDateRange(options)
  const pulseUserCap = Math.min(Math.max(options.pulseUserCap ?? 400, 50), 2000)

  let profQuery = db
    .from('user_profiles')
    .select('id, email, created_at, timezone')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
  for (const excludedId of EXCLUDED_USER_IDS) {
    profQuery = profQuery.neq('id', excludedId)
  }
  const { data: profiles, error: profErr } = await profQuery
    .order('created_at', { ascending: false })
    .limit(4000)

  if (profErr) {
    throw profErr
  }

  const users = (
    (profiles ?? []) as Array<{ id: string; email: string | null; created_at: string; timezone?: string | null }>
  ).filter((u) => !isExcludedFromAdminAnalytics(u))
  const userIds = users.map((u) => u.id)
  const emptyShadowDist: ShadowDistribution = {
    visionary: 0,
    builder: 0,
    hustler: 0,
    strategist: 0,
    hybrid: 0,
  }

  if (userIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      dateRangeStart: startDateStr,
      dateRangeEnd: endDateStr,
      funnel: [],
      deerAdvice: [],
      shadowDistribution: { ...emptyShadowDist },
      shadowSummary: 'No users in cohort window.',
      pulse: {
        points: [],
        shadowLegend: Object.keys(SHADOW_COLORS).map((k) => ({
          shadow: k as ShadowArchetypeName,
          color: SHADOW_COLORS[k as ShadowArchetypeName],
        })),
        shadowDistribution: { ...emptyShadowDist },
        activityByHourUtc: Array.from({ length: 24 }, (_, h) => ({
          hour: h,
          total: 0,
          byShadow: {},
        })),
      },
      retentionByShadow: [],
      emergency: { visitedEmergency: 0, withNextStep: 0, ratePct: 0, trustLeak: true },
      sensors: { avgPostponementsPerUser: null, ttvInsightSecondsMedian: null, ttvNote: 'Wire client timestamps to user_insights / first evening insight for TTV.' },
      deviceMix: { handheldPct: 0, desktopPct: 0, knownCount: 0, unknownCount: 0 },
      sampleNote: 'No users in cohort window.',
    }
  }

  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  const morningByUser = new Map<string, MorningRow[]>()
  const decisionsByUser = new Map<string, DecisionRow[]>()
  const eveningByUser = new Map<string, EveningRow[]>()
  const unlocksByUser = new Map<string, Array<{ unlock_type?: string; unlock_name?: string }>>()

  for (const part of chunk(userIds, 400)) {
    const [mRes, dRes, eRes, uRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('user_id, plan_date, description, why_this_matters, completed, updated_at')
        .in('user_id', part)
        .gte('plan_date', startDateStr)
        .lte('plan_date', endDateStr),
      db
        .from('morning_decisions')
        .select('user_id, plan_date, decision_type, updated_at')
        .in('user_id', part)
        .gte('plan_date', startDateStr)
        .lte('plan_date', endDateStr),
      db
        .from('evening_reviews')
        .select('user_id, review_date, mood, energy, is_draft, updated_at')
        .in('user_id', part)
        .gte('review_date', startDateStr)
        .lte('review_date', endDateStr),
      db.from('user_unlocks').select('user_id, unlock_type, unlock_name').in('user_id', part),
    ])

    for (const row of (mRes.data ?? []) as any[]) {
      const uid = row.user_id as string
      if (!morningByUser.has(uid)) morningByUser.set(uid, [])
      morningByUser.get(uid)!.push(row)
    }
    for (const row of (dRes.data ?? []) as any[]) {
      const uid = row.user_id as string
      if (!decisionsByUser.has(uid)) decisionsByUser.set(uid, [])
      decisionsByUser.get(uid)!.push(row)
    }
    for (const row of (eRes.data ?? []) as any[]) {
      const uid = row.user_id as string
      if (!eveningByUser.has(uid)) eveningByUser.set(uid, [])
      eveningByUser.get(uid)!.push(row)
    }
    for (const row of (uRes.data ?? []) as any[]) {
      const uid = row.user_id as string
      if (!unlocksByUser.has(uid)) unlocksByUser.set(uid, [])
      unlocksByUser.get(uid)!.push(row)
    }
  }

  let onboarded = 0
  let firstMorning = 0
  let firstEveningCount = 0
  let streak3 = 0
  let badgeTier1 = 0

  const shadowByUser = new Map<string, ShadowArchetypeResult>()

  for (const u of users) {
    onboarded += 1
    const mt = morningByUser.get(u.id) ?? []
    const dec = decisionsByUser.get(u.id) ?? []
    const ev = eveningByUser.get(u.id) ?? []
    const un = unlocksByUser.get(u.id) ?? []

    const { d0, d1, d2 } = firstThreeCalendarDaysFromSignup(u.created_at)
    const allow = new Set([d0, d1, d2])

    const mtWindow = mt.filter((t) => allow.has(t.plan_date))
    const decWindow = dec.filter((t) => allow.has(t.plan_date))
    const evWindow = ev.filter((t) => allow.has(t.review_date) && t.is_draft !== true)

    const hasMorningSave = mt.some((t) => (t.description ?? '').trim().length > 0)
    if (hasMorningSave) firstMorning += 1

    const mDates = new Set(mt.map((t) => t.plan_date))
    const eDates = new Set(ev.filter((x) => x.is_draft !== true).map((x) => x.review_date))
    if (ev.some((x) => x.is_draft !== true)) firstEveningCount += 1

    const streakDates = [
      ...new Set([...mDates, ...eDates]),
    ]
    if (maxStreakDays(streakDates) >= 3) streak3 += 1

    if (un.some((x) => x.unlock_type === 'badge')) badgeTier1 += 1

    if (mtWindow.length > 0 || decWindow.length > 0 || evWindow.length > 0) {
      const whyTexts = mtWindow.map((t) => t.why_this_matters ?? '')
      const tasksTotal = mtWindow.length
      const tasksCompleted = mtWindow.filter((t) => t.completed === true).length
      let strategicCount = 0
      let tacticalCount = 0
      for (const row of decWindow) {
        if (row.decision_type === 'strategic') strategicCount++
        else if (row.decision_type === 'tactical') tacticalCount++
      }
      const eveningMoodEnergy = evWindow.map((r) => ({ mood: r.mood ?? null, energy: r.energy ?? null }))
      shadowByUser.set(
        u.id,
        computeShadowArchetype({
          whyTexts,
          tasksTotal,
          tasksCompleted,
          strategicCount,
          tacticalCount,
          eveningMoodEnergy,
        })
      )
    }
  }

  const funnel: MomentumFunnelStage[] = [
    { id: 'onboarded', label: 'Onboarded', count: onboarded, pctOfPrevious: null },
    {
      id: 'first_morning',
      label: '1st morning save',
      count: firstMorning,
      pctOfPrevious: onboarded > 0 ? Math.round((firstMorning / onboarded) * 1000) / 10 : null,
    },
    {
      id: 'first_evening',
      label: '1st evening',
      count: firstEveningCount,
      pctOfPrevious: firstMorning > 0 ? Math.round((firstEveningCount / firstMorning) * 1000) / 10 : null,
    },
    {
      id: 'streak_3',
      label: '3-day streak',
      count: streak3,
      pctOfPrevious: firstEveningCount > 0 ? Math.round((streak3 / firstEveningCount) * 1000) / 10 : null,
    },
    {
      id: 'badge_tier_1',
      label: 'Badge Tier 1',
      count: badgeTier1,
      pctOfPrevious: streak3 > 0 ? Math.round((badgeTier1 / streak3) * 1000) / 10 : null,
    },
  ]

  const deerAdvice = buildDeerAdviceFromFunnel(funnel)

  const cohortSet = new Set(userIds)

  const { data: pvEmergencyAll } = await db
    .from('page_views')
    .select('user_id, path')
    .gte('entered_at', startIso)
    .lte('entered_at', endIso)
    .not('user_id', 'is', null)
    .limit(50000)

  const emergencyVisitors = new Set<string>()
  for (const r of (pvEmergencyAll ?? []) as any[]) {
    const uid = r.user_id as string
    if (!cohortSet.has(uid)) continue
    const p = String(r.path ?? '')
    if (p.includes('emergency')) emergencyVisitors.add(uid)
  }

  const { data: emRows } = await db
    .from('emergencies')
    .select('user_id, notes, containment_plan_committed_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso)

  const withNext = new Set<string>()
  for (const r of (emRows ?? []) as any[]) {
    const uid = r.user_id as string
    if (!cohortSet.has(uid)) continue
    const notes = String(r.notes ?? '').trim()
    const committed = r.containment_plan_committed_at != null
    if (committed || notes.length >= 12) withNext.add(uid)
  }

  const visited = emergencyVisitors.size
  const nextCount = [...emergencyVisitors].filter((id) => withNext.has(id)).length
  const ratePct = visited > 0 ? Math.round((nextCount / visited) * 1000) / 10 : 0
  const trustLeak = visited >= 5 && ratePct < 35

  const postponersRes = await db
    .from('task_postponements')
    .select('user_id')
    .gte('moved_at', startIso)
    .lte('moved_at', endIso)
    .limit(20000)

  const postponerIds = new Set<string>()
  let postponementsInCohort = 0
  for (const r of (postponersRes.data ?? []) as any[]) {
    const uid = r.user_id as string | undefined
    if (!uid || !cohortSet.has(uid)) continue
    postponementsInCohort += 1
    postponerIds.add(uid)
  }
  const avgPost =
    postponerIds.size > 0 ? Math.round((postponementsInCohort / postponerIds.size) * 10) / 10 : null

  const shadowCounts: Record<ShadowArchetypeName, { cohort: number; active7: number }> = {
    visionary: { cohort: 0, active7: 0 },
    builder: { cohort: 0, active7: 0 },
    hustler: { cohort: 0, active7: 0 },
    strategist: { cohort: 0, active7: 0 },
    hybrid: { cohort: 0, active7: 0 },
  }

  const sevenAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  for (const u of users) {
    const computed = shadowByUser.get(u.id)
    if (!computed) continue
    const sh = computed.label
    if (shadowCounts[sh]) shadowCounts[sh].cohort += 1
    else shadowCounts.hybrid.cohort += 1

    const mt = morningByUser.get(u.id) ?? []
    const ev = eveningByUser.get(u.id) ?? []
    const recent =
      mt.some((t) => t.plan_date >= sevenAgo) || ev.some((t) => t.review_date >= sevenAgo && t.is_draft !== true)
    if (recent) {
      if (shadowCounts[sh]) shadowCounts[sh].active7 += 1
      else shadowCounts.hybrid.active7 += 1
    }
  }

  const retentionByShadow = (Object.keys(shadowCounts) as ShadowArchetypeName[]).map((shadow) => {
    const { cohort, active7 } = shadowCounts[shadow]
    return {
      shadow,
      cohortUsers: cohort,
      activeLast7d: active7,
      retentionPct: cohort > 0 ? Math.round((active7 / cohort) * 1000) / 10 : 0,
    }
  })

  const cohortShadowDistribution: ShadowDistribution = {
    visionary: shadowCounts.visionary.cohort,
    builder: shadowCounts.builder.cohort,
    hustler: shadowCounts.hustler.cohort,
    strategist: shadowCounts.strategist.cohort,
    hybrid: shadowCounts.hybrid.cohort,
  }
  const shadowSummary = buildShadowSummary(cohortShadowDistribution)

  const emailMap = new Map(users.map((u) => [u.id, u.email]))
  const profileTimezoneByUserId = new Map(users.map((u) => [u.id, getUserTimezoneFromProfile(u)]))
  const cohortSize = userIds.length
  const pulsePoints: FounderJourneyCommandCenterPayload['pulse']['points'] = []
  const nPulse = Math.min(userIds.length, pulseUserCap)
  for (let i = 0; i < nPulse; i++) {
    const uid = userIds[i]!
    const u = users[i]!
    const mt = morningByUser.get(uid)?.length ?? 0
    const ev = (eveningByUser.get(uid) ?? []).filter((e) => e.is_draft !== true).length
    const dec = decisionsByUser.get(uid)?.length ?? 0
    const engagementScore = computeEngagementScore(mt, ev, dec, { cohortSize })
    const daysSinceSignup = differenceInCalendarDays(new Date(), new Date(u.created_at))
    const shadow = shadowByUser.get(uid)?.label ?? 'hybrid'
    const lastAction = formatLastActionLabel(uid, morningByUser, decisionsByUser, eveningByUser)
    pulsePoints.push({
      userId: uid,
      email: emailMap.get(uid) ?? null,
      shadow,
      daysSinceSignup,
      engagementScore,
      lastAction,
      recentPath: [] as FlowPathStep[],
      calendarHook: false,
      minutesToFirstMorningSave: null,
      lastDevice: 'Unknown',
      profileTimezone: 'UTC',
      userLocalTime: '',
      signupBornLocal: '',
      firstMorningStartedLocal: '',
      signupLocalHour: null,
      firstMorningCommittedAt: null,
      profileCreatedAt: u.created_at,
    })
  }

  let pathByUser = new Map<string, FlowPathStep[]>()
  try {
    pathByUser = await fetchRecentPathLabelsForUsers(
      db,
      pulsePoints.map((p) => p.userId),
      5
    )
  } catch (e) {
    console.error('[admin/tracking] recent path (page_views) failed:', e)
  }
  const pulsePointsWithPath = pulsePoints.map((p) => ({
    ...p,
    recentPath: pathByUser.get(p.userId) ?? [],
  }))

  let uaByUser = new Map<string, string | null>()
  try {
    uaByUser = await fetchLatestUserAgentsForUsers(db, pulsePointsWithPath.map((p) => p.userId))
  } catch (e) {
    console.error('[admin/tracking] latest page_view user_agent fetch failed:', e)
  }

  const pulsePointsWithDevice = pulsePointsWithPath.map((p) => {
    const ua = uaByUser.get(p.userId)
    return {
      ...p,
      lastDevice: ua ? parseDeviceType(ua) : 'Unknown',
    }
  })

  const pulseIdsForIntent = pulsePointsWithDevice.map((p) => p.userId)
  const calendarHookUserIds = new Set<string>()
  const firstMorningCommitAt = new Map<string, string>()
  if (pulseIdsForIntent.length > 0) {
    try {
      for (const part of chunk(pulseIdsForIntent, 400)) {
        const { data: subs } = await (db.from('calendar_subscriptions') as any)
          .select('user_id')
          .in('user_id', part)
          .eq('is_active', true)
        for (const r of subs ?? []) {
          const uid = (r as { user_id?: string }).user_id
          if (uid) calendarHookUserIds.add(uid)
        }
        const { data: gcal } = await (db.from('google_calendar_tokens') as any)
          .select('user_id')
          .in('user_id', part)
        for (const r of gcal ?? []) {
          const uid = (r as { user_id?: string }).user_id
          if (uid) calendarHookUserIds.add(uid)
        }
        const { data: commits } = await (db.from('morning_plan_commits') as any)
          .select('user_id, committed_at')
          .in('user_id', part)
        for (const r of commits ?? []) {
          const row = r as { user_id?: string; committed_at?: string }
          const uid = row.user_id
          const ca = row.committed_at
          if (!uid || !ca) continue
          const prev = firstMorningCommitAt.get(uid)
          if (!prev || new Date(ca).getTime() < new Date(prev).getTime()) {
            firstMorningCommitAt.set(uid, ca)
          }
        }
      }
    } catch (e) {
      console.error('[admin/tracking] calendar hook / first morning commit fetch failed:', e)
    }
  }

  const createdAtByUserId = new Map(users.map((u) => [u.id, u.created_at]))
  const dashboardClockAt = new Date()

  const pulsePointsFinal = pulsePointsWithDevice.map((p) => {
    const signup = createdAtByUserId.get(p.userId)
    const commitAt = firstMorningCommitAt.get(p.userId)
    const minutes =
      signup && commitAt ? minutesBetweenIso(signup, commitAt) : null
    const tz = profileTimezoneByUserId.get(p.userId) ?? 'UTC'
    return {
      ...p,
      calendarHook: calendarHookUserIds.has(p.userId),
      minutesToFirstMorningSave: minutes,
      profileTimezone: tz,
      userLocalTime: formatUserLocalClock(dashboardClockAt, tz),
      signupBornLocal: signup ? formatUserLocalDateTime(signup, tz) : '',
      firstMorningStartedLocal: commitAt ? formatUserLocalDateTime(commitAt, tz) : '',
      signupLocalHour: signup ? getLocalHour(signup, tz) : null,
      firstMorningCommittedAt: commitAt ?? null,
    }
  })

  let handheldN = 0
  let desktopN = 0
  let unknownDeviceN = 0
  for (const p of pulsePointsFinal) {
    if (p.lastDevice === 'Desktop') desktopN += 1
    else if (p.lastDevice === 'Mobile' || p.lastDevice === 'Tablet') handheldN += 1
    else unknownDeviceN += 1
  }
  const deviceKnown = handheldN + desktopN
  const deviceMix = {
    handheldPct: deviceKnown > 0 ? Math.round((handheldN / deviceKnown) * 1000) / 10 : 0,
    desktopPct: deviceKnown > 0 ? Math.round((desktopN / deviceKnown) * 1000) / 10 : 0,
    knownCount: deviceKnown,
    unknownCount: unknownDeviceN,
  }

  const shadowLegend = (Object.keys(SHADOW_COLORS) as ShadowArchetypeName[]).map((shadow) => ({
    shadow,
    color: SHADOW_COLORS[shadow],
  }))

  const pulseShadowDistribution: ShadowDistribution = {
    visionary: 0,
    builder: 0,
    hustler: 0,
    strategist: 0,
    hybrid: 0,
  }
  for (const p of pulsePointsFinal) {
    pulseShadowDistribution[p.shadow] = (pulseShadowDistribution[p.shadow] ?? 0) + 1
  }

  const last24Iso = subHours(new Date(), 24).toISOString()
  const activityByHourUtc: PulseActivityByHourUtc = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    total: 0,
    byShadow: {},
  }))
  const pulseUserIds = pulsePointsFinal.map((p) => p.userId)
  if (pulseUserIds.length > 0) {
    const allPv: Array<{ user_id: string; entered_at: string }> = []
    for (const part of chunk(pulseUserIds, 400)) {
      const { data: pvData, error: pvErr } = await db
        .from('page_views')
        .select('user_id, entered_at')
        .in('user_id', part)
        .gte('entered_at', last24Iso)
        .limit(8000)
      if (pvErr) throw pvErr
      allPv.push(...((pvData ?? []) as Array<{ user_id: string; entered_at: string }>))
    }
    for (const row of allPv) {
      const uid = row.user_id
      const h = new Date(row.entered_at).getUTCHours()
      const sh = shadowByUser.get(uid)?.label ?? 'hybrid'
      const bucket = activityByHourUtc[h]!
      bucket.total += 1
      bucket.byShadow[sh] = (bucket.byShadow[sh] ?? 0) + 1
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    dateRangeStart: startDateStr,
    dateRangeEnd: endDateStr,
    funnel,
    deerAdvice,
    shadowDistribution: cohortShadowDistribution,
    shadowSummary,
    pulse: {
      points: pulsePointsFinal,
      shadowLegend,
      shadowDistribution: pulseShadowDistribution,
      activityByHourUtc,
    },
    retentionByShadow,
    emergency: {
      visitedEmergency: visited,
      withNextStep: nextCount,
      ratePct,
      trustLeak,
    },
    sensors: {
      avgPostponementsPerUser: avgPost,
      ttvInsightSecondsMedian: null,
      ttvNote: 'Add client beacon: time from app open to first streamed insight.',
    },
    deviceMix,
    sampleNote:
      users.length >= 4000
        ? 'Cohort capped at 4000 newest profiles; pulse capped per pulseUserCap.'
        : null,
  }
}
