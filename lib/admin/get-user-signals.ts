/**
 * First 72h / first 3 calendar days signals for Shadow scoring and AI payloads.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, format } from 'date-fns'
import type { FlowPathStep } from '@/lib/admin/flow-path-tags'
import { minutesBetweenIso } from '@/lib/admin/flow-path-tags'
import { formatUserLocalClock, getLocalHour } from '@/lib/admin/user-local-time'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { fetchRecentPathLabelsForUsers } from '@/lib/admin/recent-path-from-page-views'
import { isExcludedAdminUserId, isExcludedFromAdminAnalytics } from '@/lib/admin/tracking'
import { parseDeviceType, userAgentFromPageViewRow } from '@/lib/admin/parse-device-type'

export { parseDeviceType } from '@/lib/admin/parse-device-type'

function wc(s: string | null | undefined): number {
  if (!s || typeof s !== 'string') return 0
  return s.trim().split(/\s+/).filter(Boolean).length
}

export type UserSignalsSnapshot = {
  userId: string
  email: string | null
  signupAt: string
  /** Days since signup (calendar). */
  accountAgeDays: number
  /** First three calendar days from signup date (inclusive). */
  windowDates: [string, string, string]
  /** Task rows in window (morning_tasks). */
  taskRows: number
  completedTasks: number
  taskCompletionRate: number
  /** Avg tasks per day in window (mornings with ≥1 task). */
  avgTasksPerMorningDay: number
  strategicCount: number
  tacticalCount: number
  strategicRatio: number
  /** Avg word count per Why line (non-empty lines only). */
  avgWhyWordCount: number
  /** Combined journal + wins + lessons word count average per evening in window. */
  avgEveningReflectionWords: number
  /** page_views rows with /emergency in path (all time, optional cap). */
  emergencyPageHits: number
  /** Postponements with moved_at in first 72h from signup. */
  postponementCountFirst72h: number
  /** Raw strings for shadow model (first 3 days). */
  whyTexts: string[]
  eveningMoodEnergy: Array<{ mood: number | null; energy: number | null }>
  /** Last few `page_views` steps with dwell / bypass hints (oldest → newest). */
  recentActions: FlowPathStep[]
  /** Active ICS calendar subscription and/or Google Calendar OAuth connected. */
  calendarHook: boolean
  /** Minutes from profile signup to first `morning_plan_commits` row; null if none. */
  minutesToFirstMorningSave: number | null
  /** From most recent `page_views` row with a User-Agent; `Unknown` if none. */
  lastDevice: string
  /** IANA zone from `user_profiles.timezone` (validated; fallback UTC). */
  profileTimezone: string
  /** User's wall clock when this snapshot was built (admin server `Date`). */
  userLocalTime: string
  /** Local hour (0–23) when the profile was created. */
  signupLocalHour: number | null
}

function firstThreeDates(signupIso: string): [string, string, string] {
  const d = new Date(signupIso)
  if (Number.isNaN(d.getTime())) {
    const t = format(new Date(), 'yyyy-MM-dd')
    return [t, t, t]
  }
  const start = format(d, 'yyyy-MM-dd')
  const d1 = format(addDays(new Date(start + 'T12:00:00.000Z'), 1), 'yyyy-MM-dd')
  const d2 = format(addDays(new Date(start + 'T12:00:00.000Z'), 2), 'yyyy-MM-dd')
  return [start, d1, d2]
}

function calendarDaysSince(signupIso: string): number {
  const a = new Date(signupIso)
  if (Number.isNaN(a.getTime())) return 0
  const b = new Date()
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000))
}

/**
 * Aggregates early user signals for Shadow archetype + AI advice payloads.
 */
export async function fetchUserSignals(db: SupabaseClient, userId: string): Promise<UserSignalsSnapshot | null> {
  if (isExcludedAdminUserId(userId)) return null

  const { data: profile, error: pErr } = await db
    .from('user_profiles')
    .select('id, email, created_at, timezone')
    .eq('id', userId)
    .maybeSingle()

  if (pErr || !profile) return null

  const row = profile as { id: string; created_at?: string; email?: string | null; timezone?: string | null }
  const signupAt = row.created_at ?? new Date().toISOString()
  const email = row.email ?? null
  const profileTimezone = getUserTimezoneFromProfile(row)
  const now = new Date()
  const userLocalTime = formatUserLocalClock(now, profileTimezone)
  const signupLocalHour = getLocalHour(signupAt, profileTimezone)
  if (isExcludedFromAdminAnalytics({ id: row.id, email })) return null
  const [d0, d1, d2] = firstThreeDates(signupAt)
  const allow = new Set([d0, d1, d2])
  const accountAgeDays = calendarDaysSince(signupAt)

  const signupStart = new Date(signupAt)
  const hr72 = addDays(signupStart, 3).toISOString()

  const [tasksRes, decRes, evRes, pvRes, postRes, lastPvRes] = await Promise.all([
    db
      .from('morning_tasks')
      .select('plan_date, description, why_this_matters, completed')
      .eq('user_id', userId)
      .in('plan_date', [d0, d1, d2]),
    db
      .from('morning_decisions')
      .select('plan_date, decision_type')
      .eq('user_id', userId)
      .in('plan_date', [d0, d1, d2]),
    db
      .from('evening_reviews')
      .select('review_date, mood, energy, journal, wins, lessons, is_draft')
      .eq('user_id', userId)
      .in('review_date', [d0, d1, d2]),
    db.from('page_views').select('id, path').eq('user_id', userId).limit(5000),
    db
      .from('task_postponements')
      .select('id, moved_at')
      .eq('user_id', userId)
      .gte('moved_at', signupAt)
      .lte('moved_at', hr72)
      .limit(5000),
    db
      .from('page_views')
      .select('metadata')
      .eq('user_id', userId)
      .order('entered_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const tasks = (tasksRes.data ?? []) as Array<{
    plan_date: string
    description?: string
    why_this_matters?: string
    completed?: boolean
  }>
  const inWindow = tasks.filter((t) => allow.has(t.plan_date))
  const taskRows = inWindow.length
  const completedTasks = inWindow.filter((t) => t.completed === true).length
  const taskCompletionRate = taskRows > 0 ? completedTasks / taskRows : 0

  const daysWithTasks = new Set(inWindow.map((t) => t.plan_date))
  const avgTasksPerMorningDay = daysWithTasks.size > 0 ? taskRows / daysWithTasks.size : 0

  const decisions = (decRes.data ?? []) as Array<{ decision_type?: string }>
  let strategicCount = 0
  let tacticalCount = 0
  for (const row of decisions) {
    if (row.decision_type === 'strategic') strategicCount++
    else if (row.decision_type === 'tactical') tacticalCount++
  }
  const totalDec = strategicCount + tacticalCount
  const strategicRatio = totalDec > 0 ? strategicCount / totalDec : 0

  const whyTexts = inWindow.map((t) => t.why_this_matters ?? '')
  const nonEmptyWhy = whyTexts.filter((t) => t.trim().length > 0)
  const avgWhyWordCount =
    nonEmptyWhy.length > 0 ? nonEmptyWhy.reduce((s, t) => s + wc(t), 0) / nonEmptyWhy.length : 0

  const evenings = (evRes.data ?? []) as Array<{
    review_date: string
    mood?: number
    energy?: number
    journal?: string
    wins?: string
    lessons?: string
    is_draft?: boolean
  }>
  const evOk = evenings.filter((e) => allow.has(e.review_date) && e.is_draft !== true)
  let refWords = 0
  let refN = 0
  for (const e of evOk) {
    const sum = wc(e.journal) + wc(e.wins) + wc(e.lessons)
    if (sum > 0) {
      refWords += sum
      refN += 1
    }
  }
  const avgEveningReflectionWords = refN > 0 ? refWords / refN : 0

  const eveningMoodEnergy = evOk.map((r) => ({ mood: r.mood ?? null, energy: r.energy ?? null }))

  const emergencyPageHits = (pvRes.data ?? []).filter((r: { path?: string }) =>
    String(r.path ?? '').toLowerCase().includes('emergency')
  ).length
  const postponementCountFirst72h = (postRes.data ?? []).length

  const lastUa = userAgentFromPageViewRow(lastPvRes.data as { metadata?: unknown } | null)
  const lastDevice = lastUa ? parseDeviceType(lastUa) : 'Unknown'

  let recentActions: FlowPathStep[] = []
  try {
    const pathMap = await fetchRecentPathLabelsForUsers(db, [userId], 5)
    recentActions = pathMap.get(userId) ?? []
  } catch {
    recentActions = []
  }

  let calendarHook = false
  let minutesToFirstMorningSave: number | null = null
  try {
    const [{ data: subRows }, { data: gRow }, { data: firstCommit }] = await Promise.all([
      (db.from('calendar_subscriptions') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1),
      (db.from('google_calendar_tokens') as any).select('user_id').eq('user_id', userId).maybeSingle(),
      (db.from('morning_plan_commits') as any)
        .select('committed_at')
        .eq('user_id', userId)
        .order('committed_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])
    calendarHook = (subRows?.length ?? 0) > 0 || Boolean(gRow)
    const fc = (firstCommit as { committed_at?: string } | null)?.committed_at
    if (fc) minutesToFirstMorningSave = minutesBetweenIso(signupAt, fc)
  } catch {
    /* keep defaults */
  }

  return {
    userId,
    email,
    signupAt,
    accountAgeDays,
    windowDates: [d0, d1, d2],
    taskRows,
    completedTasks,
    taskCompletionRate,
    avgTasksPerMorningDay,
    strategicCount,
    tacticalCount,
    strategicRatio,
    avgWhyWordCount,
    avgEveningReflectionWords,
    emergencyPageHits,
    postponementCountFirst72h,
    whyTexts,
    eveningMoodEnergy,
    recentActions,
    calendarHook,
    minutesToFirstMorningSave,
    lastDevice,
    profileTimezone,
    userLocalTime,
    signupLocalHour,
  }
}
