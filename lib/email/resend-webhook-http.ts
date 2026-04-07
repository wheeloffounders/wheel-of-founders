import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { processResendWebhookPayload } from '@/lib/email/process-resend-webhook'

/**
 * Shared POST handler for Resend webhooks (`/api/webhooks/resend` and legacy `/api/email/webhook/resend`).
 */
export async function postResendWebhook(req: NextRequest): Promise<NextResponse> {
  try {
    const expected = process.env.RESEND_WEBHOOK_SECRET?.trim()
    const got = req.headers.get('authorization')?.trim()
    if (expected && got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await req.json().catch(() => ({}))
    const db = getServerSupabase()
    const result = await processResendWebhookPayload(db, raw)
    return NextResponse.json({
      success: true,
      updatedEmailLogs: result.updatedEmailLogs,
      updatedCommunication: result.updatedCommunication,
      updated: result.updatedEmailLogs + result.updatedCommunication,
    })
  } catch (err) {
    console.error('[resend-webhook-http]', err)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
