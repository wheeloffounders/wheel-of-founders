import { NextResponse } from 'next/server'
import { checkHoneypotAlerts } from '@/lib/honeypot-monitor'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await checkHoneypotAlerts()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      alerts: results,
    })
  } catch (error) {
    console.error('[Honeypot Monitor] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check honeypot' },
      { status: 500 }
    )
  }
}
