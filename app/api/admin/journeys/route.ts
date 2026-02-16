import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { analyzeJourneys } from '@/lib/analytics/journeys'

/**
 * GET: Journey analysis for admin
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.user?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '7', 10)
    const stats = await analyzeJourneys(days)

    return NextResponse.json(stats)
  } catch (e) {
    console.error('[api/admin/journeys]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
