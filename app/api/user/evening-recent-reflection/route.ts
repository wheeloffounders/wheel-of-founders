import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { parseEveningStringArrayField } from '@/lib/founder-dna/extract-meaningful-phrase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getServerSupabase()
    const { data: row, error } = await db
      .from('evening_reviews')
      .select('journal, wins, lessons')
      .eq('user_id', session.user.id)
      .order('review_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const r = row as { journal?: string | null; wins?: unknown; lessons?: unknown } | null
    const journal = typeof r?.journal === 'string' ? r.journal : ''
    const wins = parseEveningStringArrayField(r?.wins)
    const lessons = parseEveningStringArrayField(r?.lessons)

    return NextResponse.json({ journal, wins, lessons })
  } catch (err) {
    console.error('[user/evening-recent-reflection]', err)
    return NextResponse.json({ error: 'Failed to load reflection' }, { status: 500 })
  }
}
