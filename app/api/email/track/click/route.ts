import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

function normalizeTarget(raw: string | null): string {
  if (!raw) return `${APP_URL}/dashboard`
  if (raw.startsWith('/')) return `${APP_URL}${raw}`
  try {
    const u = new URL(raw)
    const app = new URL(APP_URL)
    if (u.origin === app.origin) return u.toString()
  } catch {
    // ignore
  }
  return `${APP_URL}/dashboard`
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')
  const emailLogId = req.nextUrl.searchParams.get('email_log_id')
  const destination = normalizeTarget(urlParam)

  try {
    if (emailLogId) {
      const db = getServerSupabase()
      const { data: log } = await (db.from('email_logs') as any)
        .select('id, user_id')
        .eq('id', emailLogId)
        .maybeSingle()
      const row = log as { id?: string; user_id?: string } | null
      if (row?.id && row?.user_id) {
        const ip =
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          req.headers.get('x-real-ip') ||
          null
        await (db.from('email_events') as any).insert({
          email_log_id: row.id,
          user_id: row.user_id,
          event_type: 'clicked',
          link_url: destination,
          user_agent: req.headers.get('user-agent'),
          ip_address: ip,
        })
      }
    }
  } catch (err) {
    console.error('[email/track/click] error', err)
  }

  return NextResponse.redirect(destination, { status: 302 })
}

