/**
 * Database-based rate limiting for AI insight generation.
 * Uses personal_prompts and insight_history to count usage.
 * No Redis required - works with existing Supabase.
 */
import { getServerSupabase } from '@/lib/server-supabase'
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  format,
} from 'date-fns'

export type InsightType =
  | 'morning'
  | 'post_morning'
  | 'post_evening'
  | 'emergency'
  | 'weekly'
  | 'monthly'
  | 'quarterly'

const DAILY_TYPES: InsightType[] = ['morning', 'post_morning', 'post_evening', 'emergency']
const PERIOD_TYPES: InsightType[] = ['weekly', 'monthly', 'quarterly']

const FREE_DAILY_LIMIT = 2
const PRO_DAILY_LIMIT = 5
const EMERGENCY_DAILY_LIMIT = 5
const FREE_PERIOD_LIMIT = 1
const PRO_PERIOD_LIMIT = 3

export interface RateLimitResult {
  allowed: boolean
  used: number
  limit: number
  resetAt: string
  message?: string
}

function isProTier(tier: string | null | undefined): boolean {
  return tier === 'pro' || tier === 'beta'
}

export async function checkRateLimit(
  userId: string,
  insightType: InsightType,
  tier: string | null | undefined
): Promise<RateLimitResult> {
  const db = getServerSupabase()
  const now = new Date()

  if (DAILY_TYPES.includes(insightType)) {
    const dayStart = startOfDay(now)
    const dayStartStr = dayStart.toISOString()

    let limit: number
    if (insightType === 'emergency') {
      limit = EMERGENCY_DAILY_LIMIT
    } else {
      limit = isProTier(tier) ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT
    }

    const { count, error } = await db
      .from('personal_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('prompt_type', insightType)
      .gte('generated_at', dayStartStr)

    if (error) {
      console.error('[rate-limit] Error counting daily:', error)
      return { allowed: true, used: 0, limit, resetAt: format(dayStart, "yyyy-MM-dd'T'HH:mm:ss") }
    }

    const used = count ?? 0
    const allowed = used < limit
    const resetAt = format(startOfDay(new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)), "yyyy-MM-dd'T'HH:mm:ss")

    return {
      allowed,
      used,
      limit,
      resetAt,
      message: allowed
        ? undefined
        : `You've reached your daily limit of ${limit} ${insightType.replace('_', ' ')} insights. Resets at midnight.`,
    }
  }

  if (PERIOD_TYPES.includes(insightType)) {
    const limit = isProTier(tier) ? PRO_PERIOD_LIMIT : FREE_PERIOD_LIMIT

    let periodStart: Date
    let periodLabel: string
    if (insightType === 'weekly') {
      periodStart = startOfWeek(now, { weekStartsOn: 1 })
      periodLabel = 'week'
    } else if (insightType === 'monthly') {
      periodStart = startOfMonth(now)
      periodLabel = 'month'
    } else {
      periodStart = startOfQuarter(now)
      periodLabel = 'quarter'
    }

    const periodStartStr = periodStart.toISOString()

    const { count, error } = await db
      .from('personal_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('prompt_type', insightType)
      .gte('generated_at', periodStartStr)

    if (error) {
      console.error('[rate-limit] Error counting period:', error)
      return { allowed: true, used: 0, limit, resetAt: periodStart.toISOString() }
    }

    const used = count ?? 0
    const allowed = used < limit
    const resetAt = periodStart.toISOString()

    return {
      allowed,
      used,
      limit,
      resetAt,
      message: allowed
        ? undefined
        : `You've used all ${limit} ${insightType} insight${limit > 1 ? 's' : ''} for this ${periodLabel}. Come back next ${periodLabel}.`,
    }
  }

  return { allowed: true, used: 0, limit: 999, resetAt: now.toISOString() }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const remaining = result.allowed ? Math.max(0, result.limit - result.used - 1) : 0
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': result.resetAt,
  }
}
