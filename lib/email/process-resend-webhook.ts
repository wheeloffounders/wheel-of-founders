import type { SupabaseClient } from '@supabase/supabase-js'

type ResendWebhookEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    bounce?: { message?: string; type?: string; subType?: string }
    created_at?: string
  }
}

function asEventArray(raw: unknown): ResendWebhookEvent[] {
  if (Array.isArray(raw)) return raw as ResendWebhookEvent[]
  if (raw && typeof raw === 'object') return [raw as ResendWebhookEvent]
  return []
}

/**
 * Process Resend webhook JSON: bounce/complaint on `email_logs`, delivery/open/click on `communication_logs`.
 */
export async function processResendWebhookPayload(
  db: SupabaseClient,
  raw: unknown
): Promise<{ updatedEmailLogs: number; updatedCommunication: number }> {
  const events = asEventArray(raw)
  let updatedEmailLogs = 0
  let updatedCommunication = 0
  const nowIso = new Date().toISOString()

  for (const event of events) {
    const type = String(event?.type || '').toLowerCase()
    const messageId = event?.data?.email_id
    if (!messageId || typeof messageId !== 'string') continue

    const eventTime =
      (typeof event?.created_at === 'string' && event.created_at) ||
      (typeof event?.data?.created_at === 'string' && event.data.created_at) ||
      nowIso

    if (type.includes('bounce')) {
      await (db.from('email_logs') as any)
        .update({
          bounced: true,
          bounce_reason: event?.data?.bounce?.message || event?.data?.bounce?.type || 'bounce',
        })
        .eq('message_id', messageId)
      updatedEmailLogs++
      await (db.from('communication_logs') as any)
        .update({ status: 'bounced', updated_at: nowIso })
        .eq('resend_id', messageId)
      updatedCommunication++
    } else if (type.includes('complaint')) {
      await (db.from('email_logs') as any)
        .update({
          complaint: true,
          bounce_reason: event?.data?.bounce?.message || 'complaint',
        })
        .eq('message_id', messageId)
      updatedEmailLogs++
      await (db.from('communication_logs') as any)
        .update({ status: 'failed', updated_at: nowIso })
        .eq('resend_id', messageId)
      updatedCommunication++
    } else if (type.includes('delivered')) {
      const { error } = await (db.from('communication_logs') as any)
        .update({
          status: 'delivered',
          delivered_at: eventTime,
          updated_at: nowIso,
        })
        .eq('resend_id', messageId)
      if (!error) updatedCommunication++
    } else if (type.includes('opened') || type.includes('email.opened')) {
      const { data: row } = await (db.from('communication_logs') as any)
        .select('opened_at')
        .eq('resend_id', messageId)
        .maybeSingle()
      const openedAt = row && typeof row.opened_at === 'string' ? row.opened_at : null
      const patch: Record<string, unknown> = {
        status: 'opened',
        updated_at: nowIso,
      }
      if (!openedAt) patch.opened_at = eventTime
      const { error } = await (db.from('communication_logs') as any).update(patch).eq('resend_id', messageId)
      if (!error) updatedCommunication++
    } else if (type.includes('clicked') || type.includes('email.clicked')) {
      const { data: row } = await (db.from('communication_logs') as any)
        .select('opened_at, clicked_at')
        .eq('resend_id', messageId)
        .maybeSingle()
      const patch: Record<string, unknown> = {
        status: 'clicked',
        clicked_at: eventTime,
        updated_at: nowIso,
      }
      if (row && typeof row.opened_at !== 'string') {
        patch.opened_at = eventTime
      }
      const { error } = await (db.from('communication_logs') as any).update(patch).eq('resend_id', messageId)
      if (!error) updatedCommunication++
    }
  }

  return { updatedEmailLogs, updatedCommunication }
}
