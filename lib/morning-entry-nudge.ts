import { WOF_PENDING_DECISION_PARSER_KEY } from '@/lib/pending-decision-parser-ingest'

export type MorningEntryContext = 'decision' | 'eos' | 'energy'

const DEFAULT_NUDGE = "Good morning, Founder. Let's set your intentions."

export function parseMorningEntryContext(
  contextParam: string | undefined | null,
  parserPassLegacy: string | undefined | null
): MorningEntryContext | null {
  const raw = (contextParam ?? '').trim().toLowerCase()
  if (raw === 'decision' || raw === 'eos' || raw === 'energy') return raw
  if (parserPassLegacy === '1') return 'decision'
  return null
}

/**
 * Topic-based Mrs. Deer line for blog → morning handoffs.
 * For `decision`, pass whether a guest parser capture still exists in localStorage; otherwise copy falls back to default (no false "saved" claim).
 */
export function getNudgeMessage(context: MorningEntryContext, hasPendingDecisionCapture: boolean): string {
  if (context === 'decision' && !hasPendingDecisionCapture) {
    return DEFAULT_NUDGE
  }
  switch (context) {
    case 'decision':
      return "I've placed your 2 AM decision here. Let's set your other two Needle Movers to clear the fog."
    case 'eos':
      return "Ready to run your day like an EOS pro? Let's define your 3 Needle Movers for this cycle."
    case 'energy':
      return "Let's protect your battery today. Pick 3 Needle Movers that match your current energy level."
    default:
      return DEFAULT_NUDGE
  }
}

export function readPendingDecisionParserInStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem(WOF_PENDING_DECISION_PARSER_KEY))
  } catch {
    return false
  }
}
