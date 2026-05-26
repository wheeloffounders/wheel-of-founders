import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { loadWeeklyInsightChapters } from '@/lib/founder-dna/load-weekly-insight-chapters'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { weeks, daysWithEntries } = await loadWeeklyInsightChapters(session.user.id, db)

    return NextResponse.json({ weeks, daysWithEntries })
  } catch (err) {
    console.error('[weekly-insight/chapters] error', err)
    return NextResponse.json({ error: 'Failed to load weekly chapters' }, { status: 500 })
  }
}
