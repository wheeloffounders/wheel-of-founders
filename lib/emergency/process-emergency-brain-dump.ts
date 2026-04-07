import { fetchJson } from '@/lib/api/fetch-json'

export type EmergencySortDumpResult = {
  suggestedDescription: string
  suggestedNotes: string
}

export type EmergencySortDumpContext = {
  fireDate: string
  existingDescription?: string
  existingNotes?: string
  /** Today’s `emergencies` rows for this fire_date — Librarian stays aligned with logs, not wins/lessons. */
  todayEmergencies?: Array<{ description: string; severity: string; resolved: boolean }>
}

/**
 * POST `/api/emergency/sort-brain-dump` — turns a spoken vent into suggested “What’s the fire?” + notes for Emergency Mode.
 */
export async function processEmergencyBrainDump(
  brainDump: string,
  context: EmergencySortDumpContext
): Promise<EmergencySortDumpResult> {
  return fetchJson<EmergencySortDumpResult>('/api/emergency/sort-brain-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brainDump,
      fireDate: context.fireDate,
      existingDescription: context.existingDescription ?? '',
      existingNotes: context.existingNotes ?? '',
      todayEmergencies: context.todayEmergencies ?? [],
    }),
  })
}
