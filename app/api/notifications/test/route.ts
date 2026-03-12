import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { sendPushToUser } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** POST: Send a test push notification to the current user */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Not signed in. Please log in and try again.' }, { status: 401 })
    }

    const userId = session.user.id
    const payload = {
      title: '🦌 Test from Wheel of Founders',
      body: 'If you see this, push notifications are working!',
      url: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com',
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[notifications/test] Sending test push for user', userId, 'payload:', payload)
    }

    const { sent, failed, details } = await sendPushToUser(userId, payload)

    if (process.env.NODE_ENV === 'development' && details?.length) {
      console.log('[notifications/test] Details:', JSON.stringify(details, null, 2))
    }

    if (sent === 0) {
      const vapidError = details?.some((d) => d.error?.toLowerCase().includes('vapid'))
      const noSubs = (details?.length ?? 0) === 0
      const message = vapidError
        ? 'Push notifications are not configured on this server (missing VAPID keys). Try again after deployment is configured.'
        : noSubs
          ? 'No devices registered. Enable push above, then try again.'
          : 'No devices received the test. Enable push first and try again.'
      return NextResponse.json(
        { error: message, details: failed ? details : undefined },
        { status: vapidError ? 503 : 400 }
      )
    }

    return NextResponse.json({ success: true, sent, failed: failed || 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send test notification'
    console.error('[notifications/test]', err)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
