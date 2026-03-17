/**
 * Code Scary: Admin API to fetch and manage error logs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { isAdmin, isDevelopment } from '@/lib/admin'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!isDevelopment() && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const resolved = searchParams.get('resolved')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

    const db = serverSupabase()
    let query = db
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (resolved === 'false' || resolved === 'unresolved') {
      query = query.is('resolved_at', null)
    } else if (resolved === 'true') {
      query = query.not('resolved_at', 'is', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/errors] Query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ errors: data ?? [] })
  } catch (err) {
    console.error('[admin/errors] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!isDevelopment() && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = (await req.json()) as {
      id: string
      resolved?: boolean
      resolution_notes?: string
    }

    if (!body.id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const db = serverSupabase()
    const updates: Record<string, unknown> = {}
    if (body.resolved !== undefined) {
      updates.resolved_at = body.resolved ? new Date().toISOString() : null
    }
    if (body.resolution_notes !== undefined) {
      updates.resolution_notes = body.resolution_notes
    }

    const { error } = await (db.from('error_logs') as any).update(updates).eq('id', body.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/errors] PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
