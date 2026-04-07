import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { buildFounderJourneyCommandCenter } from '@/lib/admin/tracking'
import { authorizeAdminApiRequest } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const pulseUserCap = parseInt(req.nextUrl.searchParams.get('pulseCap') ?? '400', 10)
    const startDate = req.nextUrl.searchParams.get('startDate')?.trim()
    const endDate = req.nextUrl.searchParams.get('endDate')?.trim()

    let payload
    try {
      payload =
        startDate && endDate
          ? await buildFounderJourneyCommandCenter(adminSupabase, {
              startDate,
              endDate,
              pulseUserCap,
            })
          : await buildFounderJourneyCommandCenter(adminSupabase, {
              cohortDays: parseInt(req.nextUrl.searchParams.get('cohortDays') ?? '90', 10),
              pulseUserCap,
            })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('startDate') || msg.includes('endDate') || msg.includes('yyyy-MM-dd')) {
        return NextResponse.json({ error: msg || 'Invalid date range' }, { status: 400 })
      }
      throw err
    }

    return NextResponse.json(payload)
  } catch (e) {
    console.error('[admin/founder-journey-dashboard]', e)
    return NextResponse.json({ error: 'Failed to build dashboard' }, { status: 500 })
  }
}
