import { fetchJson } from '@/lib/api/fetch-json'

export type EveningSortDumpResult = {
  suggestedReflection: string
  suggestedWins: string[]
  suggestedLessons: string[]
}

/** Serializable context so the model can tie wins/lessons to today’s plan and fires. */
export type EveningSortDumpContext = {
  /** Founder-day `YYYY-MM-DD` — server loads `emergencies` for this `fire_date` when set. */
  reviewDate?: string
  /** Non-empty lines already on the card — model must not duplicate (esp. Resolved Crisis). */
  existingWins?: string[]
  existingLessons?: string[]
  morningTasks?: Array<{ description: string; completed: boolean; needle_mover?: boolean }>
  todayEmergencies?: Array<{ description: string; severity: string; resolved: boolean }>
}

/**
 * POST `/api/evening/sort-dump` — turns an evening brain dump into reflection + wins + lessons.
 */
export async function processEveningBrainDump(
  brainDump: string,
  context?: EveningSortDumpContext
): Promise<EveningSortDumpResult> {
  return fetchJson<EveningSortDumpResult>('/api/evening/sort-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brainDump,
      ...(context
        ? {
            reviewDate: context.reviewDate,
            existingWins: context.existingWins ?? [],
            existingLessons: context.existingLessons ?? [],
            morningTasks: context.morningTasks ?? [],
            todayEmergencies: context.todayEmergencies ?? [],
          }
        : {}),
    }),
  })
}
