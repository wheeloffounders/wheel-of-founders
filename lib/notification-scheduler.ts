/**
 * Notification scheduler - sends reminders and insight-ready notifications via push.
 * Called by the send-notifications cron at 9am and 6pm UTC daily.
 */
import { getServerSupabase } from '@/lib/server-supabase'
import { sendPushToUser } from '@/lib/push-notifications'
import {
  NotificationType,
  notificationMessages,
  type NotificationContext,
} from '@/lib/notification-types'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  startOfQuarter,
  subMonths,
  subQuarters,
  addDays,
} from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

function getUrlForType(type: NotificationType): string {
  switch (type) {
    case 'morning_reminder':
      return `${APP_URL}/morning`
    case 'evening_reminder':
      return `${APP_URL}/evening`
    case 'profile_reminder':
      return `${APP_URL}/profile`
    case 'weekly_insight':
      return `${APP_URL}/weekly`
    case 'monthly_insight':
      return `${APP_URL}/monthly-insight`
    case 'quarterly_insight':
      return `${APP_URL}/quarterly`
    default:
      return APP_URL
  }
}

/** Send push to user; returns true if at least one device received it */
async function sendPushForType(
  userId: string,
  type: NotificationType,
  context?: NotificationContext
): Promise<boolean> {
  const { title, body } = notificationMessages[type](context)
  const { sent } = await sendPushToUser(userId, {
    title,
    body,
    url: getUrlForType(type),
  })
  return sent > 0
}

export async function checkAndSendNotifications(): Promise<{
  morningSent: number
  eveningSent: number
  profileSent: number
  weeklySent: number
  monthlySent: number
  quarterlySent: number
}> {
  const db = getServerSupabase()
  const now = new Date()
  const stats = {
    morningSent: 0,
    eveningSent: 0,
    profileSent: 0,
    weeklySent: 0,
    monthlySent: 0,
    quarterlySent: 0,
  }

  // Get all user_ids that have push subscriptions (we only send to users with push)
  const { data: subRows } = await (db.from('push_subscriptions') as any)
    .select('user_id')
  const usersWithPush = new Set((subRows || []).map((r: { user_id: string }) => r.user_id))

  if (usersWithPush.size === 0) return stats

  // 1. Morning/evening reminders - fixed times: 9am UTC (morning), 6pm UTC (evening)
  const utcHour = now.getUTCHours()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  if (utcHour === 9) {
    const { data: morningUsers } = await (db.from('user_notification_settings') as any)
      .select('user_id, last_morning_sent')
      .eq('morning_enabled', true)

    for (const row of morningUsers || []) {
      const r = row as { user_id: string; last_morning_sent?: string }
      if (!usersWithPush.has(r.user_id)) continue
      const lastSent = r.last_morning_sent ? new Date(r.last_morning_sent) : null
      if (lastSent && lastSent >= todayStart) continue
      const ok = await sendPushForType(r.user_id, 'morning_reminder')
      if (ok) {
        await (db.from('user_notification_settings') as any)
          .update({ last_morning_sent: now.toISOString(), updated_at: now.toISOString() })
          .eq('user_id', r.user_id)
        stats.morningSent++
      }
    }
  }

  if (utcHour === 18) {
    const { data: eveningUsers } = await (db.from('user_notification_settings') as any)
      .select('user_id, last_evening_sent')
      .eq('evening_enabled', true)

    for (const row of eveningUsers || []) {
      const r = row as { user_id: string; last_evening_sent?: string }
      if (!usersWithPush.has(r.user_id)) continue
      const lastSent = r.last_evening_sent ? new Date(r.last_evening_sent) : null
      if (lastSent && lastSent >= todayStart) continue
      const ok = await sendPushForType(r.user_id, 'evening_reminder')
      if (ok) {
        await (db.from('user_notification_settings') as any)
          .update({ last_evening_sent: now.toISOString(), updated_at: now.toISOString() })
          .eq('user_id', r.user_id)
        stats.eveningSent++
      }
    }
  }

  // 2. Profile reminders - 7 days after signup (only for users with push)
  const sevenDaysAgo = addDays(now, -7)
  const { data: profileUsers } = await db
    .from('user_profiles')
    .select('id')
    .is('profile_completed_at', null)
    .is('profile_reminder_sent_at', null)
    .lte('created_at', sevenDaysAgo.toISOString())
    .limit(50)

  for (const user of profileUsers || []) {
    const u = user as { id: string }
    if (!usersWithPush.has(u.id)) continue

    const ok = await sendPushForType(u.id, 'profile_reminder')
    if (ok) {
      await (db.from('user_profiles') as any).update({
        profile_reminder_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', u.id)
      stats.profileSent++
    }
  }

  // 3. Weekly insight ready - Mondays
  if (now.getDay() === 1) {
    const lastWeekStart = startOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 })
    const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 })
    const weekRange = `${format(lastWeekStart, 'MMM d')}–${format(lastWeekEnd, 'MMM d, yyyy')}`

    const { data: weeklyUsers } = await db
      .from('personal_prompts')
      .select('user_id')
      .eq('prompt_type', 'weekly')
      .eq('prompt_date', format(lastWeekStart, 'yyyy-MM-dd'))

    const uniqueWeekly = [...new Set((weeklyUsers || []).map((r: { user_id: string }) => r.user_id))]
    for (const userId of uniqueWeekly) {
      if (!usersWithPush.has(userId)) continue
      const ok = await sendPushForType(userId, 'weekly_insight', { weekRange })
      if (ok) stats.weeklySent++
    }
  }

  // 4. Monthly insight ready - 1st of month
  if (now.getDate() === 1) {
    const lastMonth = subMonths(now, 1)
    const monthName = format(lastMonth, 'MMMM')
    const monthStart = startOfMonth(lastMonth)

    const { data: monthlyUsers } = await db
      .from('personal_prompts')
      .select('user_id')
      .eq('prompt_type', 'monthly')
      .eq('prompt_date', format(monthStart, 'yyyy-MM-dd'))

    const uniqueMonthly = [...new Set((monthlyUsers || []).map((r: { user_id: string }) => r.user_id))]
    for (const userId of uniqueMonthly) {
      if (!usersWithPush.has(userId)) continue
      const ok = await sendPushForType(userId, 'monthly_insight', { month: monthName })
      if (ok) stats.monthlySent++
    }
  }

  // 5. Quarterly insight ready - 1st of Jan, Apr, Jul, Oct
  const isFirstOfQuarter =
    [0, 3, 6, 9].includes(now.getMonth()) && now.getDate() === 1
  if (isFirstOfQuarter) {
    const lastQuarter = subQuarters(now, 1)
    const quarter = Math.floor(lastQuarter.getMonth() / 3) + 1
    const qStart = startOfQuarter(lastQuarter)

    const { data: quarterlyUsers } = await db
      .from('personal_prompts')
      .select('user_id')
      .eq('prompt_type', 'quarterly')
      .eq('prompt_date', format(qStart, 'yyyy-MM-dd'))

    const uniqueQuarterly = [...new Set((quarterlyUsers || []).map((r: { user_id: string }) => r.user_id))]
    for (const userId of uniqueQuarterly) {
      if (!usersWithPush.has(userId)) continue
      const ok = await sendPushForType(userId, 'quarterly_insight', { quarter })
      if (ok) stats.quarterlySent++
    }
  }

  return stats
}
