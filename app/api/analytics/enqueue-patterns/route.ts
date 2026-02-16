import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { extractPatternsFromText } from '@/lib/analytics/pattern-extractor'

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

    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as object)
            })
          },
        },
      }
    )
    const { data: { session } } = await authClient.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
