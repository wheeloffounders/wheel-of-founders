import { NextResponse } from 'next/server'
import { checkAndSendNotifications } from '@/lib/notification-scheduler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Comprehensive notification cron.
 * Runs at 9am and 6pm UTC daily. Sends:
 * - Morning reminders at 9am UTC (all users with morning_enabled)
 * - Evening reminders at 6pm UTC (all users with evening_enabled)
 * - Profile reminders (7 days after signup)
 * - Weekly insight ready (Mondays)
 * - Monthly insight ready (1st of month)
 * - Quarterly insight ready (1st of Jan/Apr/Jul/Oct)
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await checkAndSendNotifications()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats,
    })
  } catch (error) {
    console.error('[send-notifications] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
