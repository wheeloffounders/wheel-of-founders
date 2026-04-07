import type { EmergencyTriageJson } from '@/lib/types/emergency-triage'

const MAX_PREVIEW = 160

/**
 * Single line for history cards — same triage_json fields as ActiveFireResolutionCard.
 * Prefers actionable text (one safe step / immediate_action), then encouragement / insight.
 */
export function previewEmergencyTriageLine(
  triage: EmergencyTriageJson | null | undefined
): string | null {
  if (!triage) return null
  const immediate =
    typeof triage.immediate_action === 'string' ? triage.immediate_action.trim() : ''
  const step = typeof triage.oneSafeStep === 'string' ? triage.oneSafeStep.trim() : ''
  const insight = typeof triage.insight === 'string' ? triage.insight.trim() : ''
  const encouragement =
    typeof triage.encouragement === 'string' ? triage.encouragement.trim() : ''

  const raw = immediate || step || insight || encouragement
  if (!raw) return null
  return raw.length > MAX_PREVIEW ? `${raw.slice(0, MAX_PREVIEW)}…` : raw
}
