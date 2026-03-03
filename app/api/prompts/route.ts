/**
 * Honeypot: Looks like a prompts endpoint. Logs and blocks.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

const HONEYPOT_ENABLED = process.env.HONEYPOT_ENABLED === 'true'

export async function GET(req: NextRequest) {
  if (!HONEYPOT_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await logHoneypot(req, 'GET')
  return NextResponse.json(
    { error: 'Access denied', message: 'This incident has been logged.' },
    { status: 403 }
  )
}

export async function POST(req: NextRequest) {
  if (!HONEYPOT_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  let body = null
  try {
    body = await req.json()
  } catch {
    // ignore
  }
  await logHoneypot(req, 'POST', body)
  return NextResponse.json(
    { error: 'Not found', message: "This endpoint doesn't exist." },
    { status: 404 }
  )
}

async function logHoneypot(req: NextRequest, method: string, payload?: unknown) {
  try {
    const db = getServerSupabase()
    await (db.from('security_logs') as any).insert({
      action: 'honeypot_triggered',
      reason: `prompts:${method}`,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || null,
      metadata: payload ? { payload } : null,
    })
  } catch (e) {
    console.error('[Honeypot] Log failed:', e)
  }
}
