import { sanitizeAiJsonText } from '@/lib/morning/sanitize-ai-json-text'

export type EmergencyVentSeverity = 'hot' | 'warm' | 'contained'

/** LLM output for `/api/emergency/sort-vent` — maps to compose form fields. */
export type EmergencyVentSortResult = {
  severity: EmergencyVentSeverity
  title: string
  notes: string
}

const SEVERITIES: readonly EmergencyVentSeverity[] = ['hot', 'warm', 'contained']

export function normalizeEmergencyVentSeverity(raw: unknown): EmergencyVentSeverity {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (SEVERITIES.includes(s as EmergencyVentSeverity)) return s as EmergencyVentSeverity
  if (s.includes('hot') || s.includes('🔥')) return 'hot'
  if (s.includes('contain') || s.includes('✅') || s.includes('cool')) return 'contained'
  if (s.includes('warm') || s.includes('⚠')) return 'warm'
  return 'warm'
}

/**
 * Parse model JSON into severity + title (what's the fire) + notes.
 * Accepts `title` or `suggestedDescription` / `description` for the short headline.
 */
export function parseEmergencyVentSortJson(raw: string): EmergencyVentSortResult | null {
  const trimmed = sanitizeAiJsonText(raw).trim()
  if (!trimmed) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>

  const severity = normalizeEmergencyVentSeverity(o.severity ?? o.suggestedSeverity ?? o.level)

  const titleRaw =
    typeof o.title === 'string'
      ? o.title
      : typeof o.suggestedDescription === 'string'
        ? o.suggestedDescription
        : typeof o.description === 'string'
          ? o.description
          : ''
  const title = titleRaw.trim().slice(0, 4000)

  const notesRaw =
    typeof o.notes === 'string'
      ? o.notes
      : typeof o.suggestedNotes === 'string'
        ? o.suggestedNotes
        : ''
  const notes = notesRaw.trim().slice(0, 8000)

  if (!title && !notes) return null

  if (!title && notes) {
    const br = notes.indexOf('\n')
    const head = (br === -1 ? notes : notes.slice(0, br)).trim()
    const tail = br === -1 ? '' : notes.slice(br + 1).trim()
    return {
      severity,
      title: head.slice(0, 4000),
      notes: tail,
    }
  }

  return { severity, title, notes }
}

export const EMERGENCY_VENT_MIN_CHARS = 8
