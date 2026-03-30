import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { loadFounderJourneyPayload } from '@/lib/founder-dna/load-founder-journey-payload'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await loadFounderJourneyPayload(session.user.id)
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[founder-dna/journey] error', err)
    return NextResponse.json({ error: 'Failed to load founder journey' }, { status: 500 })
  }
}
