/**
 * Progress calculation for monthly/quarterly insight unlocks.
 * Counts distinct days with ANY entries (morning tasks OR evening reviews).
 */

import { supabase } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

export interface ProgressData {
  current: number
  required: number
  percentage: number
  isUnlocked: boolean
}

const MONTHLY_REQUIRED = 15
const MONTHLY_WINDOW_DAYS = 30
const QUARTERLY_REQUIRED = 45
const QUARTERLY_WINDOW_DAYS = 90

async function getActiveDaysInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Set<string>> {
  const dates = new Set<string>()

  const [tasksRes, reviewsRes] = await Promise.all([
    supabase
      .from('morning_tasks')
      .select('plan_date')
      .eq('user_id', userId)
      .gte('plan_date', startDate)
      .lte('plan_date', endDate),
    supabase
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .gte('review_date', startDate)
      .lte('review_date', endDate),
  ])

  const tasks = tasksRes.data ?? []
  const reviews = reviewsRes.data ?? []

  tasks.forEach((t) => {
    if (t.plan_date) dates.add(t.plan_date)
  })
  reviews.forEach((r) => {
    if (r.review_date) dates.add(r.review_date)
  })

  return dates
}

export async function getMonthlyProgress(userId: string): Promise<ProgressData> {
  const end = new Date()
  const start = subDays(end, MONTHLY_WINDOW_DAYS)
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')

  const dates = await getActiveDaysInRange(userId, startStr, endStr)
  const current = dates.size
  const percentage = Math.min(100, Math.round((current / MONTHLY_REQUIRED) * 100))
  const isUnlocked = current >= MONTHLY_REQUIRED

  return {
    current,
    required: MONTHLY_REQUIRED,
    percentage,
    isUnlocked,
  }
}

export async function getQuarterlyProgress(userId: string): Promise<ProgressData> {
  const end = new Date()
  const start = subDays(end, QUARTERLY_WINDOW_DAYS)
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')

  const dates = await getActiveDaysInRange(userId, startStr, endStr)
  const current = dates.size
  const percentage = Math.min(100, Math.round((current / QUARTERLY_REQUIRED) * 100))
  const isUnlocked = current >= QUARTERLY_REQUIRED

  return {
    current,
    required: QUARTERLY_REQUIRED,
    percentage,
    isUnlocked,
  }
}

export type UnlockType = 'monthly' | 'quarterly'

export interface NextUnlockResult {
  type: UnlockType
  progress: ProgressData
  daysRemaining: number
}

export async function getNextUnlock(userId: string): Promise<NextUnlockResult | null> {
  const [monthly, quarterly] = await Promise.all([
    getMonthlyProgress(userId),
    getQuarterlyProgress(userId),
  ])

  if (monthly.isUnlocked && quarterly.isUnlocked) return null
  if (monthly.isUnlocked) return { type: 'quarterly', progress: quarterly, daysRemaining: quarterly.required - quarterly.current }
  if (quarterly.isUnlocked) return { type: 'monthly', progress: monthly, daysRemaining: monthly.required - monthly.current }

  const monthlyRemaining = monthly.required - monthly.current
  const quarterlyRemaining = quarterly.required - quarterly.current

  if (monthlyRemaining <= quarterlyRemaining) {
    return { type: 'monthly', progress: monthly, daysRemaining: monthlyRemaining }
  }
  return { type: 'quarterly', progress: quarterly, daysRemaining: quarterlyRemaining }
}
