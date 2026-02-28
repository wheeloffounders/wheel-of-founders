/**
 * Remove internal coaching labels from insight text. Users see content only.
 * Shared between server (personal-coaching) and client (useStreamingInsight).
 */
export function filterInsightLabels(text: string): string {
  if (!text?.trim()) return text
  return text
    .replace(/^Observe:\s*/gim, '')
    .replace(/^Validate:\s*/gim, '')
    .replace(/^Reframe:\s*/gim, '')
    .replace(/^Question:\s*/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
