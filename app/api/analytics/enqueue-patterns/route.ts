import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { extractPatternsFromText } from '@/lib/analytics/pattern-extractor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Enqueue user reflection content for AI pattern extraction.
 * Requires authenticated session. Content is queued for batch processing by cron.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      source_table: string
      source_id: string
      content: string
    }
    const { source_table, source_id, content } = body
    if (!source_table || !content?.trim()) {
      return NextResponse.json({ error: 'source_table and content required' }, { status: 400 })
    }

    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ ok: false, skipped: 'not_authenticated' })
    }

    await extractPatternsFromText(
      session.user.id,
      source_table,
      source_id || '',
      content.trim().slice(0, 8000)
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[enqueue-patterns]', e)
    return NextResponse.json({ error: 'Failed to enqueue' }, { status: 500 })
  }
}
