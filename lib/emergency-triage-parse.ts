import type { EmergencyTriageJson } from '@/lib/types/emergency-triage'

/**
 * Parse triage_json from PostgREST (object or JSON string). Returns null if empty or invalid.
 */
export function triageJsonFromRow(raw: unknown): EmergencyTriageJson | null {
  if (raw == null) return null
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
  const t = obj as Record<string, unknown>
  const hasContent =
    (typeof t.oneSafeStep === 'string' && t.oneSafeStep.trim() !== '') ||
    (typeof t.encouragement === 'string' && t.encouragement.trim() !== '')
  if (!hasContent) return null
  return obj as EmergencyTriageJson
}

export function hasPersistedTriage(raw: unknown): boolean {
  return triageJsonFromRow(raw) != null
}
