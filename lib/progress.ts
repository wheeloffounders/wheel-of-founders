/**
 * Insight page unlocks: days with entries (unique dates with morning commits or evening reviews).
 * Aligns with /api/founder-dna/journey progressive unlocks.
 */

import { supabase } from '@/lib/supabase'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import {
  MONTHLY_INSIGHT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'

export interface ProgressData {
  current: number
  required: number
  percentage: number
  isUnlocked: boolean
}

function progressForDaysWithEntries(daysWithEntries: number, required: number): ProgressData {
  const current = Math.min(daysWithEntries, required)
  const percentage = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0
  return {
    current,
    required,
    percentage,
    isUnlocked: daysWithEntries >= required,
  }
}

export async function getWeeklyInsightProgress(userId: string): Promise<ProgressData> {
  const dwe = await getDaysWithEntries(userId, supabase)
  return progressForDaysWithEntries(dwe, WEEKLY_INSIGHT_MIN_DAYS)
}

export async function getMonthlyProgress(userId: string): Promise<ProgressData> {
  const dwe = await getDaysWithEntries(userId, supabase)
  return progressForDaysWithEntries(dwe, MONTHLY_INSIGHT_MIN_DAYS)
}

export async function getQuarterlyProgress(userId: string): Promise<ProgressData> {
  const dwe = await getDaysWithEntries(userId, supabase)
  return progressForDaysWithEntries(dwe, QUARTERLY_INSIGHT_MIN_DAYS)
}

export type UnlockType = 'weekly' | 'monthly' | 'quarterly'

export interface NextUnlockResult {
  type: UnlockType
  progress: ProgressData
  daysRemaining: number
}

/** Next insight page unlock by days with entries (weekly → monthly → quarterly). */
export async function getNextUnlock(userId: string): Promise<NextUnlockResult | null> {
  const [w, m, q] = await Promise.all([
    getWeeklyInsightProgress(userId),
    getMonthlyProgress(userId),
    getQuarterlyProgress(userId),
  ])

  if (w.isUnlocked && m.isUnlocked && q.isUnlocked) return null
  if (!w.isUnlocked) {
    return { type: 'weekly', progress: w, daysRemaining: Math.max(0, w.required - w.current) }
  }
  if (!m.isUnlocked) {
    return { type: 'monthly', progress: m, daysRemaining: Math.max(0, m.required - m.current) }
  }
  return { type: 'quarterly', progress: q, daysRemaining: Math.max(0, q.required - q.current) }
}
