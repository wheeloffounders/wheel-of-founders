import { fetchJson } from '@/lib/api/fetch-json'
import type { EmergencyVentSeverity } from '@/lib/emergency/parse-emergency'

export type EmergencyVentSortResponse = {
  severity: EmergencyVentSeverity
  title: string
  notes: string
}

export type ProcessEmergencyVentBody = {
  vent: string
  fireDate: string
  mergeHint?: {
    existingDescription: string
    existingNotes: string
    severity: EmergencyVentSeverity
  }
}

/** POST `/api/emergency/sort-vent` — vent → severity + title + notes. */
export async function processEmergencyVent(
  body: ProcessEmergencyVentBody,
  init?: RequestInit
): Promise<EmergencyVentSortResponse> {
  return fetchJson<EmergencyVentSortResponse>('/api/emergency/sort-vent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
    body: JSON.stringify(body),
    ...init,
  })
}
