import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** POST: Update user preference (e.g. planning_mode for Light Mode) */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to update preferences.' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { planning_mode } = body as { planning_mode?: 'full' | 'light' }

    if (planning_mode && !['full', 'light'].includes(planning_mode)) {
      return NextResponse.json({ error: 'Invalid planning_mode' }, { status: 400 })
    }

    const db = getServerSupabase()
    const upsertPayload = {
      id: session.user.id,
      ...(planning_mode && { planning_mode }),
      updated_at: new Date().toISOString(),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit user_profiles in this context
    const { error } = await (db.from('user_profiles') as any).upsert(upsertPayload, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[User preferences]', err)
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 })
  }
}

/** GET: Read user preferences. Returns defaults when not authenticated (avoids 401 breaking UI). */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ planning_mode: 'full' })
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
    const prefs = (data as { planning_mode?: 'full' | 'light' } | null) ?? null
    return NextResponse.json({
      planning_mode: prefs?.planning_mode ?? 'full',
    })
  } catch {
    return NextResponse.json({ planning_mode: 'full' })
  }
}
