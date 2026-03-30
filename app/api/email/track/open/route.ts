import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { markEmailOpened } from '@/lib/email/engagement'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
)

export async function GET(req: NextRequest) {
  try {
    const emailLogId = req.nextUrl.searchParams.get('email_log_id')
    if (emailLogId) {
      const db = getServerSupabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_logs typing gap in generated schema
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_events typing gap in generated schema
        await (db.from('email_events') as any).insert({
          email_log_id: row.id,
          user_id: row.user_id,
          event_type: 'opened',
          user_agent: req.headers.get('user-agent'),
          ip_address: ip,
        })
        await markEmailOpened(row.user_id)
      }
    }
  } catch (err) {
    console.error('[email/track/open] error', err)
  }

  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

