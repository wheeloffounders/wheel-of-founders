import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET: Fetch selections for a week (or last week for generate context) */
export async function GET(req: NextRequest) {
  try {
    console.log('[weekly-insight-selections] GET: start')
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      console.log('[weekly-insight-selections] GET: no session (401)')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[weekly-insight-selections] GET: user', session.user.id)

    const { searchParams } = new URL(req.url)
    const weekStart = searchParams.get('weekStart')
    console.log('[weekly-insight-selections] GET: weekStart', weekStart)

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { data, error } = (await db
      .from('weekly_insight_selections')
      .select('favorite_win_indices, key_lesson_indices')
      .eq('user_id', session.user.id)
      .eq('week_start_date', weekStart)
      .maybeSingle()) as any

    if (error) {
      console.error('[weekly-insight-selections] GET: Supabase error', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { error: 'Failed to fetch selections', debug: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      )
    }

    console.log('[weekly-insight-selections] GET: success', { hasData: !!data })
    return NextResponse.json({
      favoriteWinIndices: data?.favorite_win_indices ?? [],
      keyLessonIndices: data?.key_lesson_indices ?? [],
    })
  } catch (err) {
    console.error('[weekly-insight-selections] GET: caught', err)
    return NextResponse.json(
      { error: 'Failed to fetch', debug: process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined },
      { status: 500 }
    )
  }
}

/** POST: Upsert selections for a week */
export async function POST(req: NextRequest) {
  try {
    console.log('[weekly-insight-selections] POST: start')
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      console.log('[weekly-insight-selections] POST: no session (401)')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[weekly-insight-selections] POST: user', session.user.id)

    const body = await req.json()
    const { weekStart, favoriteWinIndices, keyLessonIndices } = body as {
      weekStart: string
      favoriteWinIndices: number[]
      keyLessonIndices: number[]
    }
    console.log('[weekly-insight-selections] POST: body', { weekStart, favoriteWinIndices, keyLessonIndices })

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
    }

    const payload = {
      user_id: session.user.id,
      week_start_date: weekStart,
      favorite_win_indices: Array.isArray(favoriteWinIndices) ? favoriteWinIndices : [],
      key_lesson_indices: Array.isArray(keyLessonIndices) ? keyLessonIndices : [],
      updated_at: new Date().toISOString(),
    }
    console.log('[weekly-insight-selections] POST: upsert payload', payload)

    const db = getServerSupabase()
    const { error } = await (db.from('weekly_insight_selections') as any).upsert(payload, {
      onConflict: 'user_id,week_start_date',
    })

    if (error) {
      console.error('[weekly-insight-selections] POST: Supabase error', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { error: 'Failed to save selections', debug: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      )
    }

    console.log('[weekly-insight-selections] POST: success')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[weekly-insight-selections] POST: caught', err)
    return NextResponse.json(
      { error: 'Failed to save', debug: process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined },
      { status: 500 }
    )
  }
}
