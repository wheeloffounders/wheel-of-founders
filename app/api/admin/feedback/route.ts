import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profile } = await (db.from('user_profiles') as any)
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: feedback, error } = await (db.from('feedback') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[Admin Feedback] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json(feedback)
  } catch (err) {
    console.error('[Admin Feedback] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
