import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { sendPushToUser } from '@/lib/push-notifications'
import { notificationMessages } from '@/lib/notification-types'
import type { NotificationType } from '@/lib/notification-types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const type = (body.type as NotificationType) || 'morning_reminder'

    const validTypes: NotificationType[] = [
      'morning_reminder',
      'evening_reminder',
      'profile_reminder',
      'weekly_insight',
      'monthly_insight',
      'quarterly_insight',
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { data: subs } = await (db.from('push_subscriptions') as any)
      .select('id')
      .eq('user_id', session.user.id)

    if (!subs?.length) {
      return NextResponse.json(
        { error: 'No push subscription found. Enable notifications in Settings first.' },
        { status: 400 }
      )
    }

    const context =
      type === 'weekly_insight'
        ? { weekRange: 'Feb 24 – Mar 2, 2026' }
        : type === 'monthly_insight'
          ? { month: 'February' }
          : type === 'quarterly_insight'
            ? { quarter: 1 }
            : undefined

    const { title, body: messageBody } = notificationMessages[type](context)

    const links: Record<string, string> = {
      morning_reminder: `${APP_URL}/morning`,
      evening_reminder: `${APP_URL}/evening`,
      profile_reminder: `${APP_URL}/profile`,
      weekly_insight: `${APP_URL}/weekly`,
      monthly_insight: `${APP_URL}/monthly-insight`,
      quarterly_insight: `${APP_URL}/quarterly`,
    }
    const url = links[type] || APP_URL

    const { sent } = await sendPushToUser(session.user.id, {
      title: `[Test] ${title}`,
      body: messageBody,
      url,
    })

    if (sent === 0) {
      return NextResponse.json(
        { error: 'Failed to send test push notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test push notification sent to your device(s)',
    })
  } catch (error) {
    console.error('[notifications/test] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
