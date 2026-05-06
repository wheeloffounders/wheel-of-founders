import type { SupabaseClient } from '@supabase/supabase-js'

export const WOF_PENDING_DECISION_PARSER_KEY = 'wof_pending_decision_parser'

export type PendingDecisionParserPayload = {
  decision?: string
  doorType?: 'one-way' | 'two-way'
  capturedAt?: string
  source?: string
}

/**
 * Moves a guest Decision Parser capture from localStorage into `morning_decisions` once.
 * Clears localStorage after attempt. Safe to call multiple times (idempotent when row exists).
 */
export async function ingestPendingDecisionParserIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  planDate: string
): Promise<'inserted' | 'noop' | 'error'> {
  if (typeof window === 'undefined') return 'noop'
  let raw: string | null = null
  try {
    raw = localStorage.getItem(WOF_PENDING_DECISION_PARSER_KEY)
    if (!raw) return 'noop'
    const pending = JSON.parse(raw) as PendingDecisionParserPayload
    const decisionText = typeof pending.decision === 'string' ? pending.decision.trim() : ''
    const doorType = pending.doorType === 'one-way' || pending.doorType === 'two-way' ? pending.doorType : null

    if (!decisionText || !doorType) {
      localStorage.removeItem(WOF_PENDING_DECISION_PARSER_KEY)
      return 'noop'
    }

    const { data: existingDecision } = await supabase
      .from('morning_decisions')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_date', planDate)
      .maybeSingle()

    if (existingDecision) {
      localStorage.removeItem(WOF_PENDING_DECISION_PARSER_KEY)
      return 'noop'
    }

    const decisionType = doorType === 'one-way' ? 'strategic' : 'tactical'
    const { error: insertDecisionError } = await supabase.from('morning_decisions').insert({
      user_id: userId,
      plan_date: planDate,
      decision: decisionText,
      decision_type: decisionType,
      why_this_decision:
        doorType === 'one-way'
          ? 'Captured from 2 AM Decision Parser (one-way door).'
          : 'Captured from 2 AM Decision Parser (two-way door experiment).',
    })

    localStorage.removeItem(WOF_PENDING_DECISION_PARSER_KEY)

    if (insertDecisionError) {
      console.warn('[pending-decision-parser] insert failed:', insertDecisionError)
      return 'error'
    }
    return 'inserted'
  } catch (e) {
    console.warn('[pending-decision-parser] ingest skipped:', e)
    try {
      localStorage.removeItem(WOF_PENDING_DECISION_PARSER_KEY)
    } catch {
      // ignore
    }
    return 'error'
  }
}
