import type { QuarterlyNarrative } from '@/lib/quarterly/buildQuarterlyNarrative'
import { FREEMIUM_QUARTERLY_NARRATIVE_PLACEHOLDER } from '@/lib/quarterly/freemium-quarterly-insight-placeholder'

/** Plain-text preview for freemium narrative lock (matches Pro section depth). */
export function buildQuarterlyNarrativeTeaser(narrative: QuarterlyNarrative | null): string {
  if (!narrative) return FREEMIUM_QUARTERLY_NARRATIVE_PLACEHOLDER

  const parts: string[] = []

  if (narrative.shiftShowedUp.length > 0) {
    const first = narrative.shiftShowedUp[0]
    parts.push(
      `${first.heading}\n\n${first.winSamples.slice(0, 2).join('\n')}\n\n${first.revelation}`
    )
  }

  if (narrative.transformationThread) {
    const t = narrative.transformationThread
    parts.push(
      `Across these months, one thread runs through everything: You stopped asking ${t.oldQuestion}. You started asking ${t.newQuestion}.\n\n${t.body}`
    )
  }

  if (narrative.carriedForward.length > 0) {
    const s = narrative.carriedForward[0]
    parts.push(`You learned to ${s.title}.\n\n${s.detail}`)
  }

  if (narrative.surprise?.headline) {
    parts.push(`${narrative.surprise.headline}\n\n${narrative.surprise.body}`)
  }

  if (narrative.guidingQuestion?.question) {
    parts.push(`Next quarter, hold this close: ${narrative.guidingQuestion.question}`)
  }

  const joined = parts.join('\n\n').trim()
  return joined.length > 120 ? joined : FREEMIUM_QUARTERLY_NARRATIVE_PLACEHOLDER
}
