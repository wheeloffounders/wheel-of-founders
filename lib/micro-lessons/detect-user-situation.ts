import type { SupabaseClient } from '@supabase/supabase-js'
import { format, subDays, parseISO } from 'date-fns'
import type { UserSituation } from './types'

export interface DetectionState {
  totalEveningReviews: number
  totalMorningPlanDays: number
  hasMorningToday: boolean
  hasEveningToday: boolean
  hasMorningYesterday: boolean
  hasEveningYesterday: boolean
  todayTaskCount: number
  yesterdayTaskCount: number
  yesterdayCompletedCount: number
  lastActivityDate: string | null
  currentStreak: number
  daysSinceLastActivity: number
  hasDecisionYesterday: boolean
  hasDecisionToday: boolean
  repeatedActionPlan: { action_plan: string; count: number } | null
  decisionsWithoutEveningCount: number
  eveningsWithoutMorningCount: number
  /** Profile completed (profile_completed_at set); when false, show incomplete-onboarding */
  profileCompleted: boolean
}

export interface DetectResult {
  situation: UserSituation
  tokens: Record<string, string | number>
}

/**
 * Fetches all state needed for situation detection (minimal round-trips).
 */
export async function fetchDetectionState(
  db: SupabaseClient,
  userId: string,
  today: string
): Promise<DetectionState> {
  const yesterday = format(subDays(parseISO(today), 1), 'yyyy-MM-dd')
  const threeDaysAgo = format(subDays(parseISO(today), 3), 'yyyy-MM-dd')

  const [
    reviewsRes,
    tasksRes,
    decisionsRes,
    profileRes,
  ] = await Promise.all([
    db.from('evening_reviews').select('review_date').eq('user_id', userId).order('review_date', { ascending: false }).limit(200),
    db.from('morning_tasks').select('plan_date, completed, action_plan').eq('user_id', userId).order('plan_date', { ascending: false }).limit(500),
    db.from('morning_decisions').select('plan_date').eq('user_id', userId).order('plan_date', { ascending: false }).limit(100),
    db.from('user_profiles').select('current_streak, longest_streak, last_review_date, profile_completed_at').eq('id', userId).maybeSingle(),
  ])

  const reviews = (reviewsRes.data ?? []) as { review_date: string }[]
  const tasks = (tasksRes.data ?? []) as { plan_date: string; completed?: boolean; action_plan?: string | null }[]
  const decisions = (decisionsRes.data ?? []) as { plan_date: string }[]
  const profile = profileRes.data as { current_streak?: number; last_review_date?: string | null; profile_completed_at?: string | null } | null

  const reviewDates = new Set(reviews.map((r) => r.review_date))
  const planDates = new Set(tasks.map((t) => t.plan_date))
  const decisionDates = new Set(decisions.map((d) => d.plan_date))

  const hasMorningToday = planDates.has(today)
  const hasEveningToday = reviewDates.has(today)
  const hasMorningYesterday = planDates.has(yesterday)
  const hasEveningYesterday = reviewDates.has(yesterday)
  const hasDecisionYesterday = decisionDates.has(yesterday)
  const hasDecisionToday = decisionDates.has(today)

  const todayTasks = tasks.filter((t) => t.plan_date === today)
  const yesterdayTasks = tasks.filter((t) => t.plan_date === yesterday)
  const todayTaskCount = todayTasks.length
  const yesterdayTaskCount = yesterdayTasks.length
  const yesterdayCompletedCount = yesterdayTasks.filter((t) => t.completed === true).length

  const lastReview = reviews[0]?.review_date ?? null
  const lastPlan = tasks.length ? tasks.reduce((max, t) => (t.plan_date > max ? t.plan_date : max), tasks[0].plan_date) : null
  const lastActivityDate = [lastReview, lastPlan].filter(Boolean).sort().reverse()[0] ?? null
  const daysSinceLastActivity = lastActivityDate
    ? Math.floor((new Date(today).getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const currentStreak = profile?.current_streak ?? 0

  // Decisions without evening: plan_date has decision but no review that day
  let decisionsWithoutEveningCount = 0
  for (const d of decisions.slice(0, 14)) {
    if (!reviewDates.has(d.plan_date)) decisionsWithoutEveningCount++
  }
  // Evenings without morning (that day): review exists but no plan that day
  let eveningsWithoutMorningCount = 0
  for (const r of reviews.slice(0, 14)) {
    if (!planDates.has(r.review_date)) eveningsWithoutMorningCount++
  }

  // Repeated action_plan among incomplete tasks (same action_plan appearing on multiple days, not completed)
  const incompleteByPlan = new Map<string, number>()
  for (const t of tasks) {
    if (t.completed === true) continue
    const plan = t.action_plan ?? 'unknown'
    incompleteByPlan.set(plan, (incompleteByPlan.get(plan) ?? 0) + 1)
  }
  let repeatedActionPlan: { action_plan: string; count: number } | null = null
  const ACTION_PLAN_LABELS: Record<string, string> = {
    my_zone: 'your focused work time',
    systemize: 'Systemize',
    delegate_founder: 'Delegate',
    eliminate_founder: 'Eliminate',
    quick_win_founder: 'Quick Win',
  }
  for (const [plan, count] of incompleteByPlan) {
    if (count >= 2 && plan !== 'unknown') {
      repeatedActionPlan = { action_plan: ACTION_PLAN_LABELS[plan] ?? plan, count }
      break
    }
  }

  const profileCompleted = !!profile?.profile_completed_at

  return {
    totalEveningReviews: reviews.length,
    totalMorningPlanDays: planDates.size,
    hasMorningToday,
    hasEveningToday,
    hasMorningYesterday,
    hasEveningYesterday,
    todayTaskCount,
    yesterdayTaskCount,
    yesterdayCompletedCount,
    lastActivityDate,
    currentStreak,
    daysSinceLastActivity,
    hasDecisionYesterday,
    hasDecisionToday,
    repeatedActionPlan,
    decisionsWithoutEveningCount,
    eveningsWithoutMorningCount,
    profileCompleted,
  }
}

/**
 * Returns the single best situation and tokens for the given page and state.
 * Priority order is enforced: first match wins (situations ordered by priority in the lesson library).
 */
export function detectUserSituation(
  state: DetectionState,
  page: 'morning' | 'evening',
  today: string
): DetectResult | null {
  const {
    totalEveningReviews,
    totalMorningPlanDays,
    hasMorningToday,
    hasEveningToday,
    hasMorningYesterday,
    hasEveningYesterday,
    yesterdayTaskCount,
    yesterdayCompletedCount,
    currentStreak,
    daysSinceLastActivity,
    repeatedActionPlan,
    decisionsWithoutEveningCount,
    eveningsWithoutMorningCount,
  } = state

  const completionRate =
    yesterdayTaskCount > 0
      ? Math.round((yesterdayCompletedCount / yesterdayTaskCount) * 100)
      : 0

  // Build candidates with priority (lower = higher priority). We'll pick one.
  const candidates: { situation: UserSituation; priority: number; tokens: Record<string, string | number> }[] = []

  if (page === 'morning') {
    if (totalMorningPlanDays === 0 && totalEveningReviews === 0) {
      candidates.push({ situation: 'new-user-first-morning', priority: 1, tokens: {} })
    } else if (hasEveningYesterday && !hasMorningToday && totalMorningPlanDays >= 1) {
      candidates.push({ situation: 'evening-done-morning-pending', priority: 2, tokens: {} })
    } else if (daysSinceLastActivity >= 3) {
      candidates.push({
        situation: 'missed-multiple-days',
        priority: 1,
        tokens: { days: daysSinceLastActivity },
      })
    } else if (hasMorningYesterday && !hasEveningYesterday) {
      candidates.push({ situation: 'missed-yesterday', priority: 2, tokens: {} })
    } else if (currentStreak >= 7) {
      candidates.push({
        situation: 'consistent-7-days',
        priority: 5,
        tokens: { personalizedInsight: 'your rhythm is becoming a habit.' },
      })
    } else if (currentStreak >= 3) {
      candidates.push({ situation: 'consistent-3-days', priority: 5, tokens: {} })
    } else if (yesterdayTaskCount > 0 && completionRate < 50) {
      candidates.push({
        situation: 'low-task-completion',
        priority: 3,
        tokens: { completionRate },
      })
    } else if (yesterdayTaskCount > 0 && completionRate >= 80) {
      candidates.push({
        situation: 'high-task-completion',
        priority: 4,
        tokens: { completionRate },
      })
    } else if (repeatedActionPlan) {
      candidates.push({
        situation: 'struggling-with-specific-task',
        priority: 4,
        tokens: { taskType: repeatedActionPlan.action_plan, count: repeatedActionPlan.count },
      })
    } else if (decisionsWithoutEveningCount >= 2) {
      candidates.push({ situation: 'decision-without-reflection', priority: 4, tokens: {} })
    } else if (currentStreak >= 14 || totalEveningReviews >= 14) {
      candidates.push({ situation: 'power-user', priority: 6, tokens: {} })
    } else if (daysSinceLastActivity >= 5 && totalEveningReviews >= 3) {
      candidates.push({ situation: 'at-risk-churn', priority: 2, tokens: {} })
    }
  }

  if (page === 'evening') {
    if (totalEveningReviews === 0 && totalMorningPlanDays === 0) {
      candidates.push({ situation: 'new-user-first-evening', priority: 1, tokens: {} })
    } else if (hasMorningToday && !hasEveningToday) {
      const taskCount = state.todayTaskCount || 3
      candidates.push({
        situation: 'morning-done-evening-pending',
        priority: 2,
        tokens: { taskCount },
      })
    } else if (hasMorningToday && hasEveningToday && totalEveningReviews === 1 && totalMorningPlanDays >= 1) {
      candidates.push({ situation: 'full-loop-completed-first-time', priority: 1, tokens: {} })
    } else if (daysSinceLastActivity >= 3) {
      candidates.push({
        situation: 'missed-multiple-days',
        priority: 1,
        tokens: { days: daysSinceLastActivity },
      })
    } else if (eveningsWithoutMorningCount >= 2) {
      candidates.push({ situation: 'reflection-without-decision', priority: 4, tokens: {} })
    } else if (currentStreak >= 7) {
      candidates.push({
        situation: 'consistent-7-days',
        priority: 5,
        tokens: { personalizedInsight: 'seven nights of looking back—that clarity compounds.' },
      })
    } else if (currentStreak >= 3) {
      candidates.push({ situation: 'consistent-3-days', priority: 5, tokens: {} })
    } else if (yesterdayTaskCount > 0 && completionRate < 50) {
      candidates.push({
        situation: 'low-task-completion',
        priority: 3,
        tokens: { completionRate },
      })
    } else if (repeatedActionPlan) {
      candidates.push({
        situation: 'struggling-with-specific-task',
        priority: 4,
        tokens: { taskType: repeatedActionPlan.action_plan, count: repeatedActionPlan.count },
      })
    } else if (currentStreak >= 14 || totalEveningReviews >= 14) {
      candidates.push({ situation: 'power-user', priority: 6, tokens: {} })
    } else if (daysSinceLastActivity >= 5 && totalEveningReviews >= 3) {
      candidates.push({ situation: 'at-risk-churn', priority: 2, tokens: {} })
    }
  }

  if (candidates.length === 0) return null
  const best = candidates.sort((a, b) => a.priority - b.priority)[0]
  return { situation: best.situation, tokens: best.tokens }
}

/** Hour of day (0–23) for time-of-day weighting; e.g. after 17 = evening reminder higher priority */
export interface DetectHighestPriorityOptions {
  hour?: number
}

/**
 * Returns the single highest-priority situation for dashboard (one lesson for all users).
 * Order: onboarding → evening pending (boost after 5pm) → morning pending → missed days → new user → first loop → task completion → streaks → power/at-risk → high completion.
 */
export function detectHighestPrioritySituation(
  state: DetectionState,
  today: string,
  options: DetectHighestPriorityOptions = {}
): DetectResult | null {
  const {
    totalEveningReviews,
    totalMorningPlanDays,
    hasMorningToday,
    hasEveningToday,
    hasMorningYesterday,
    hasEveningYesterday,
    todayTaskCount,
    yesterdayTaskCount,
    yesterdayCompletedCount,
    currentStreak,
    daysSinceLastActivity,
    repeatedActionPlan,
    decisionsWithoutEveningCount,
    eveningsWithoutMorningCount,
    profileCompleted,
  } = state

  const completionRate =
    yesterdayTaskCount > 0
      ? Math.round((yesterdayCompletedCount / yesterdayTaskCount) * 100)
      : 0
  const hour = options.hour ?? new Date().getHours()
  const isAfter5pm = hour >= 17

  // Check in explicit priority order (first match wins)
  if (!profileCompleted) {
    return { situation: 'incomplete-onboarding', tokens: {} }
  }
  if (hasMorningToday && !hasEveningToday) {
    const taskCount = state.todayTaskCount || 3
    return {
      situation: 'morning-done-evening-pending',
      tokens: { taskCount },
    }
  }
  if (hasEveningYesterday && !hasMorningToday && totalMorningPlanDays >= 1) {
    return { situation: 'evening-done-morning-pending', tokens: {} }
  }
  if (daysSinceLastActivity >= 3) {
    return { situation: 'missed-multiple-days', tokens: { days: daysSinceLastActivity } }
  }
  if (totalMorningPlanDays === 0 && totalEveningReviews === 0) {
    return { situation: 'new-user-first-morning', tokens: {} }
  }
  if (hasMorningToday && hasEveningToday && totalEveningReviews === 1 && totalMorningPlanDays >= 1) {
    return { situation: 'first-full-loop-complete', tokens: {} }
  }
  if (yesterdayTaskCount > 0 && completionRate < 50) {
    return { situation: 'low-task-completion', tokens: { completionRate } }
  }
  if (repeatedActionPlan) {
    return {
      situation: 'struggling-with-specific-task',
      tokens: { taskType: repeatedActionPlan.action_plan, count: repeatedActionPlan.count },
    }
  }
  if (currentStreak >= 3 && currentStreak < 7) {
    return { situation: 'consistent-3-days', tokens: {} }
  }
  if (currentStreak >= 7) {
    return {
      situation: 'consistent-7-days',
      tokens: { personalizedInsight: isAfter5pm ? 'seven nights of looking back—that clarity compounds.' : 'your rhythm is becoming a habit.' },
    }
  }
  if (decisionsWithoutEveningCount >= 2) {
    return { situation: 'decision-without-reflection', tokens: {} }
  }
  if (eveningsWithoutMorningCount >= 2) {
    return { situation: 'reflection-without-decision', tokens: {} }
  }
  if (currentStreak >= 14 || totalEveningReviews >= 14) {
    return { situation: 'power-user', tokens: {} }
  }
  if (daysSinceLastActivity >= 5 && totalEveningReviews >= 3) {
    return { situation: 'at-risk-churn', tokens: {} }
  }
  if (yesterdayTaskCount > 0 && completionRate >= 80) {
    return { situation: 'high-task-completion', tokens: { completionRate } }
  }

  return null
}
