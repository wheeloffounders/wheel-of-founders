/**
 * Code Scary: Receive error logs from client.
 * Saves to error_logs table via service role.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    const body = (await req.json()) as {
      error_type?: string
      error_message?: string
      stack_trace?: string
      url?: string
      component?: string
      severity?: string
      metadata?: Record<string, unknown>
    }

    const errorType = body.error_type ?? 'Error'
    const errorMessage = body.error_message ?? 'Unknown error'
    const severity = ['low', 'medium', 'high', 'critical'].includes(body.severity ?? '')
      ? body.severity
      : 'medium'

    const db = serverSupabase()
    const { error } = await (db.from('error_logs') as any).insert({
      error_type: errorType,
      error_message: errorMessage.slice(0, 2000),
      stack_trace: body.stack_trace?.slice(0, 10000) ?? null,
      user_id: session?.user?.id ?? null,
      url: body.url?.slice(0, 500) ?? null,
      component: body.component?.slice(0, 200) ?? null,
      severity,
      metadata: body.metadata ?? null,
    })

    if (error) {
      console.error('[error-log] Insert failed:', error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[error-log] Error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
