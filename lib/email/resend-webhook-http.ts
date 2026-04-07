import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getServerSupabase } from '@/lib/server-supabase'
import { processResendWebhookPayload } from '@/lib/email/process-resend-webhook'

function parsePayloadFromRawBody(rawBody: string): unknown {
  if (!rawBody.trim()) return {}
  return JSON.parse(rawBody) as unknown
}

/**
 * Shared POST handler for Resend webhooks (`/api/webhooks/resend` and legacy `/api/email/webhook/resend`).
 * Verifies Svix signatures (svix-id / svix-timestamp / svix-signature) using the raw body.
 * Falls back to `Authorization: Bearer <RESEND_WEBHOOK_SECRET>` when Svix headers are absent (local tooling).
 */
export async function postResendWebhook(req: NextRequest): Promise<NextResponse> {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
    if (!secret) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const rawBody = await req.text()
    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')
    const hasSvix = Boolean(svixId && svixTimestamp && svixSignature)

    let raw: unknown
    if (hasSvix) {
      try {
        const wh = new Webhook(secret)
        raw = wh.verify(rawBody, {
          'svix-id': svixId!,
          'svix-timestamp': svixTimestamp!,
          'svix-signature': svixSignature!,
        })
      } catch {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    } else {
      const got = req.headers.get('authorization')?.trim()
      if (got !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      try {
        raw = parsePayloadFromRawBody(rawBody)
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
      }
    }

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
