/**
 * Fallback insight body only — UI adds "— Mrs. Deer: " once.
 * Do not include "Mrs. Deer" here (avoids "Mrs. Deer: Mrs. Deer …").
 */
export const YOUR_STORY_INSIGHT_FALLBACK =
  'Something meaningful showed up here — keep naming what you notice.'

/** Safe for client: strip duplicate "Mrs. Deer" if present in stored/API text. */
export function insightBodyForDisplay(stored: string | undefined, fallback: string): string {
  const base = (stored?.trim() || fallback).trim()
  const stripped = base
    .replace(/^Mrs\.?\s*Deer\s*:\s*/i, '')
    .replace(/^Mrs\.?\s*Deer\s+/i, '')
    .trim()
  return stripped.length > 0 ? stripped : fallback
}
