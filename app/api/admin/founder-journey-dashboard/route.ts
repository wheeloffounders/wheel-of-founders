import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import {
  buildFounderJourneyCommandCenter,
  type FounderJourneyCommandCenterPayload,
  type FounderJourneyPulseSectionPayload,
} from '@/lib/admin/tracking'
import { authorizeAdminApiRequest } from '@/lib/admin'
import { withAdminCache } from '@/lib/admin/api-cache'
import {
  commandCenterCohortKey,
  invalidateCommandCenterCohort,
} from '@/lib/admin/command-center-cohort-cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isPulseSectionPayload(
  payload: FounderJourneyCommandCenterPayload | FounderJourneyPulseSectionPayload
): payload is FounderJourneyPulseSectionPayload {
  return 'pulse' in payload && !('funnel' in payload)
}

export async function GET(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const db = adminSupabase
    const sp = req.nextUrl.searchParams
    const pulseUserCap = parseInt(sp.get('pulseCap') ?? '100', 10)
    const startDate = sp.get('startDate')?.trim()
    const endDate = sp.get('endDate')?.trim()
    const includePulse = sp.get('includePulse') !== '0' && sp.get('includePulse') !== 'false'
    const pulseOnly = sp.get('pulseOnly') === '1' || sp.get('pulseOnly') === 'true'

    if (sp.get('refresh') === '1' || sp.get('refresh') === 'true') {
      if (startDate && endDate) {
        invalidateCommandCenterCohort(commandCenterCohortKey(startDate, endDate))
      } else {
        invalidateCommandCenterCohort()
      }
    }

    const cacheKey = [
      'command-center',
      pulseOnly ? 'pulse' : includePulse ? 'full' : 'core',
      startDate ?? '',
      endDate ?? '',
      String(pulseUserCap),
    ].join(':')

    const { data: payload, cached } = await withAdminCache(cacheKey, sp, async () => {
      if (startDate && endDate) {
        return buildFounderJourneyCommandCenter(db, {
          startDate,
          endDate,
          pulseUserCap,
          includePulse: pulseOnly ? true : includePulse,
          pulseOnly,
        })
      }
      return buildFounderJourneyCommandCenter(db, {
        cohortDays: parseInt(sp.get('cohortDays') ?? '7', 10),
        pulseUserCap,
        includePulse: pulseOnly ? true : includePulse,
        pulseOnly,
      })
    })

    if (pulseOnly && isPulseSectionPayload(payload)) {
      return NextResponse.json({ ...payload, meta: { cached, pulseOnly: true } })
    }

    return NextResponse.json({
      ...(payload as FounderJourneyCommandCenterPayload),
      meta: { cached, includePulse },
    })
  } catch (e) {
    console.error('[admin/founder-journey-dashboard]', e)
    return NextResponse.json({ error: 'Failed to build dashboard' }, { status: 500 })
  }
}
