/**
 * Save insight to personal_prompts using admin client (bypasses RLS).
 * Use when client-side insert fails with auth.uid() null (e.g. after long streaming).
 * Server validates session and inserts with correct user_id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json()) as {
      prompt_type: string
      prompt_date: string
      prompt_text: string
      generation_count?: number
    }

    if (
      !body.prompt_type ||
      !body.prompt_date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.prompt_date) ||
      typeof body.prompt_text !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid body: prompt_type, prompt_date (yyyy-MM-dd), prompt_text required' }, { status: 400 })
    }

    if (!['morning', 'post_morning', 'post_evening', 'emergency'].includes(body.prompt_type)) {
      return NextResponse.json({ error: 'Invalid prompt_type' }, { status: 400 })
    }

    const db = serverSupabase()
    const genCount = body.generation_count ?? 1

    const { data, error } = await (db.from('personal_prompts') as any)
      .upsert(
        {
          user_id: session.user.id,
          prompt_type: body.prompt_type,
          prompt_date: body.prompt_date,
          prompt_text: body.prompt_text,
          stage_context: null,
          generation_count: genCount,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,prompt_type,prompt_date' }
      )
      .select('id')

    if (error) {
      console.error('[insights/save] Admin upsert failed:', error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    const savedId = (data as { id?: string }[])?.[0]?.id
    return NextResponse.json({ success: true, id: savedId })
  } catch (err) {
    console.error('[insights/save] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    )
  }
}
