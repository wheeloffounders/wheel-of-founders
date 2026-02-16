import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

/** POST: Update user preference (e.g. planning_mode for Light Mode) */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { planning_mode } = body as { planning_mode?: 'full' | 'light' }

    if (planning_mode && !['full', 'light'].includes(planning_mode)) {
      return NextResponse.json({ error: 'Invalid planning_mode' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { error } = await db
      .from('user_profiles')
      .upsert(
        {
          id: session.user.id,
          ...(planning_mode && { planning_mode }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (error) {
      return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[User preferences]', err)
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 })
  }
}

/** GET: Read user preferences */
export async function GET() {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data, error } = await db
      .from('user_profiles')
      .select('planning_mode')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ planning_mode: 'full' })
    }
    return NextResponse.json({
      planning_mode: data?.planning_mode ?? 'full',
    })
  } catch {
    return NextResponse.json({ planning_mode: 'full' })
  }
}
