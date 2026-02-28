import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Cron: Send morning and evening notification reminders.
 * Vercel Cron schedule: 0 2 * * * (daily at 2 AM).
 * Secured with CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = getServerSupabase()
  const now = new Date()

  // Look back over the previous calendar day for missed reminders.
  const previousDay = new Date(now)
  previousDay.setDate(previousDay.getDate() - 1)

  let morningSent = 0
  let eveningSent = 0

  try {
    const {
      data: users,
      error,
    } = await (db.from('user_notification_settings') as any)
      .select(
        'user_id, morning_enabled, morning_time, evening_enabled, evening_time, push_subscription, last_morning_sent, last_evening_sent'
      )
      .or('morning_enabled.eq.true,evening_enabled.eq.true')

    if (error) {
      console.error('[cron/send-notifications] Error querying users:', error)
      return Response.json({ error: 'Query failed' }, { status: 500 })
    }

    type UserRow = {
      user_id: string | null
      morning_enabled?: boolean | null
      morning_time?: string | null
      evening_enabled?: boolean | null
      evening_time?: string | null
      last_morning_sent?: string | null
      last_evening_sent?: string | null
      push_subscription?: unknown
    }

    const notifications: Array<{ userId: string; type: 'morning' | 'evening'; scheduledAt: string }> =
      []

    for (const raw of (users ?? []) as UserRow[]) {
      if (!raw.user_id) continue

      // Morning
      if (raw.morning_enabled && raw.morning_time) {
        const [mh, mm] = raw.morning_time.split(':')
        const morningDateTime = new Date(previousDay)
        morningDateTime.setHours(parseInt(mh || '0', 10), parseInt(mm || '0', 10), 0, 0)

        const lastMorning =
          raw.last_morning_sent != null ? new Date(raw.last_morning_sent) : null

        if (!Number.isNaN(morningDateTime.getTime())) {
          // Only send if we haven't already sent for that scheduled morning.
          if (!lastMorning || lastMorning < morningDateTime) {
            notifications.push({
              userId: raw.user_id,
              type: 'morning',
              scheduledAt: morningDateTime.toISOString(),
            })
          }
        }
      }

      // Evening
      if (raw.evening_enabled && raw.evening_time) {
        const [eh, em] = raw.evening_time.split(':')
        const eveningDateTime = new Date(previousDay)
        eveningDateTime.setHours(parseInt(eh || '0', 10), parseInt(em || '0', 10), 0, 0)

        const lastEvening =
          raw.last_evening_sent != null ? new Date(raw.last_evening_sent) : null

        if (!Number.isNaN(eveningDateTime.getTime())) {
          if (!lastEvening || lastEvening < eveningDateTime) {
            notifications.push({
              userId: raw.user_id,
              type: 'evening',
              scheduledAt: eveningDateTime.toISOString(),
            })
          }
        }
      }
    }

    for (const notification of notifications) {
      // TODO: Implement web push or email delivery here using push_subscription or email.
      console.log(
        `[cron/send-notifications] Should send ${notification.type} notification to user ${notification.userId} (scheduled at ${notification.scheduledAt})`
      )

      const updateField =
        notification.type === 'morning'
          ? { last_morning_sent: now.toISOString() }
          : { last_evening_sent: now.toISOString() }

      await (db.from('user_notification_settings') as any)
        .update(updateField)
        .eq('user_id', notification.userId)

      if (notification.type === 'morning') {
        morningSent++
      } else {
        eveningSent++
      }
    }

    return Response.json({
      success: true,
      checkedAt: now.toISOString(),
      previousDay: previousDay.toISOString(),
      morningSent,
      eveningSent,
    })
  } catch (error) {
    console.error('[cron/send-notifications] Unexpected error:', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

