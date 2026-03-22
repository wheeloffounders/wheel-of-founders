import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { recordPageViewsBatch, type BatchPageViewInput } from '@/lib/analytics/journeys'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_BATCH = 50

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * POST body: { pageViews: Array<{ path, timestamp?, session_id?, referrer?, metadata? }> }
 * Auth optional (anonymous views allowed); user_id set when session cookie / bearer present.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    const userId = session?.user?.id ?? null

    const body = await req.json().catch(() => ({}))
    const raw = isRecord(body) ? body.pageViews : undefined
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: 'No page views' }, { status: 400 })
    }
    if (raw.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_BATCH} page views per request` }, { status: 400 })
    }

    const items: BatchPageViewInput[] = []
    for (const row of raw) {
      if (!isRecord(row)) continue
      const path = typeof row.path === 'string' ? row.path.trim() : ''
      if (!path) continue

      const timestamp =
        typeof row.timestamp === 'number'
          ? row.timestamp
          : typeof row.timestamp === 'string'
            ? row.timestamp
            : undefined

      const sessionId =
        typeof row.session_id === 'string' ? row.session_id : row.session_id === null ? null : undefined
      const referrer =
        typeof row.referrer === 'string' ? row.referrer : row.referrer === null ? null : undefined
      const metadata = isRecord(row.metadata) ? row.metadata : undefined

      items.push({ path, timestamp, sessionId, referrer, metadata })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid page views' }, { status: 400 })
    }

    const { error } = await recordPageViewsBatch(items, userId)
    if (error) {
      return NextResponse.json({ error: 'Failed to insert' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: items.length })
  } catch (e) {
    console.error('[api/analytics/batch-page-views]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
