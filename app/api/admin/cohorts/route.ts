import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

/**
 * GET: Cohort retention for admin
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.user?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: cohorts, error } = await db
      .from('cohort_retention')
      .select('*')
      .order('cohort_week', { ascending: false })
      .limit(12)

    if (error) {
      console.error('[api/admin/cohorts]', error)
      return NextResponse.json({ cohorts: [] })
    }

    return NextResponse.json({ cohorts: cohorts ?? [] })
  } catch (e) {
    console.error('[api/admin/cohorts]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
