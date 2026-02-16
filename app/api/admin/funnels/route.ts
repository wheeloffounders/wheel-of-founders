import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getFunnelAnalysis } from '@/lib/analytics/funnels'

/**
 * GET: Funnel analysis for admin
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.user?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const funnelName = req.nextUrl.searchParams.get('funnel') ?? 'daily_flow'
    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)

    const steps = await getFunnelAnalysis(funnelName, days)

    return NextResponse.json({ steps })
  } catch (e) {
    console.error('[api/admin/funnels]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
