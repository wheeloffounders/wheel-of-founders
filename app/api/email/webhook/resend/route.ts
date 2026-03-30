import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ResendWebhookEvent = {
  type?: string
  data?: {
    email_id?: string
    bounce?: { reason?: string }
  }
}

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.RESEND_WEBHOOK_SECRET?.trim()
    const got = req.headers.get('authorization')?.trim()
    if (expected && got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await req.json().catch(() => ({}))) as ResendWebhookEvent | ResendWebhookEvent[]
    const events = Array.isArray(payload) ? payload : [payload]
    const db = getServerSupabase()
    let updated = 0

    for (const event of events) {
      const type = String(event?.type || '').toLowerCase()
      const messageId = event?.data?.email_id
      if (!messageId) continue

      if (type.includes('bounce')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom email_logs columns pending generated typing
        await (db.from('email_logs') as any).update({
          bounced: true,
          bounce_reason: event?.data?.bounce?.reason || 'bounce',
        })
          .eq('message_id', messageId)
        updated++
      } else if (type.includes('complaint')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom email_logs columns pending generated typing
        await (db.from('email_logs') as any).update({
          complaint: true,
          bounce_reason: event?.data?.bounce?.reason || 'complaint',
        })
          .eq('message_id', messageId)
        updated++
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch (err) {
    console.error('[email/webhook/resend] error', err)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

