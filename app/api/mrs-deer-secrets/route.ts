/**
 * Honeypot: Tempting name for scrapers. Logs and blocks.
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

async function logHoneypot(req: NextRequest, method: string) {
  try {
    const db = getServerSupabase()
    await (db.from('security_logs') as any).insert({
      action: 'honeypot_triggered',
      reason: `mrs-deer-secrets:${method}`,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || null,
    })
  } catch (e) {
    console.error('[Honeypot] Log failed:', e)
  }
}
