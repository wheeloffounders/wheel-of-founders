import { formatInTimeZone } from 'date-fns-tz'
import { getServerSupabase } from '@/lib/server-supabase'

type EmailEventRow = {
  event_type?: string | null
  created_at?: string | null
}

export type EmailEngagementStats = {
  engagementScore: number
  bestSendHour: number | null
  bestSendConfidence: number
  lastEmailOpenAt: string | null
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function roundTo(n: number, digits: number): number {
  const p = 10 ** digits
  return Math.round(n * p) / p
}

export async function computeEmailEngagementStats(
  userId: string,
  timezone: string
): Promise<EmailEngagementStats> {
  const db = getServerSupabase()
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_events typing not in generated schema
  const { data } = await (db.from('email_events') as any)
    .select('event_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000)

  const events = (data || []) as EmailEventRow[]
  const opens = events.filter((e) => e.event_type === 'opened')
  const clicks = events.filter((e) => e.event_type === 'clicked')
  const lastOpen = opens[0]?.created_at || null

  // 0..100 score with light recency bonus.
  const openPoints = Math.min(60, opens.length * 3)
  const clickPoints = Math.min(30, clicks.length * 2)
  let recencyBonus = 0
  if (lastOpen) {
    const ageDays = Math.max(0, (Date.now() - new Date(lastOpen).getTime()) / (24 * 60 * 60 * 1000))
    recencyBonus = clamp(10 - ageDays, 0, 10)
  }
  const engagementScore = roundTo(clamp(openPoints + clickPoints + recencyBonus, 0, 100), 2)

  const hourCounts = new Array<number>(24).fill(0)
  for (const o of opens) {
    if (!o.created_at) continue
    const h = Number(formatInTimeZone(new Date(o.created_at), timezone, 'H'))
    if (Number.isFinite(h) && h >= 0 && h <= 23) {
      hourCounts[h]++
    }
  }

  let bestSendHour: number | null = null
  let maxCount = 0
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > maxCount) {
      maxCount = hourCounts[h]
      bestSendHour = h
    }
  }

  const bestSendConfidence =
    opens.length > 0 && maxCount > 0
      ? roundTo(clamp(maxCount / Math.max(1, opens.length), 0, 1), 3)
      : 0

  return {
    engagementScore,
    bestSendHour,
    bestSendConfidence,
    lastEmailOpenAt: lastOpen,
  }
}

export async function recomputeEmailEngagementForUser(
  userId: string,
  timezone: string
): Promise<EmailEngagementStats> {
  const db = getServerSupabase()
  const stats = await computeEmailEngagementStats(userId, timezone)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom profile columns pending generated typing
  await (db.from('user_profiles') as any)
    .update({
      engagement_score: stats.engagementScore,
      best_send_hour: stats.bestSendHour,
      best_send_confidence: stats.bestSendConfidence,
      last_email_open_at: stats.lastEmailOpenAt,
    })
    .eq('id', userId)

  return stats
}

export async function markEmailOpened(userId: string): Promise<void> {
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom profile columns pending generated typing
  await (db.from('user_profiles') as any)
    .update({
      last_email_open_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

