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

export type InsightType = 'morning' | 'evening' | 'emergency' | 'post-morning'

/**
 * Ensures insights end with a complete sentence and proper punctuation.
 * If the text is cut off mid-sentence, it will truncate at the last complete sentence.
 */
export function ensureCompleteInsight(text: string, type: InsightType): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  // If the text already ends with proper punctuation, return as-is
  if (trimmed.match(/[.!?]$/)) {
    return trimmed
  }

  // Find the last complete sentence
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || []

  if (sentences.length > 0) {
    return sentences.join(' ').trim()
  }

  // If no complete sentences found, add appropriate ending based on type
  const defaultEndings: Record<InsightType, string> = {
    morning: ' What do you think?',
    'post-morning': ' What would make today feel like a step forward?',
    evening: ' Rest well, founder.',
    emergency: " You've got this.",
  }

  return trimmed + defaultEndings[type]
}

/**
 * Smarter word count enforcement - treats limits as guidelines, not hard rules.
 * Prioritizes complete sentences over exact word counts.
 */
export function enforceWordCount(
  text: string,
  min: number,
  max: number,
  insightType: InsightType
): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const words = trimmed.split(/\s+/).length

  console.log(`[Word Count] ${insightType}: ${words} words (target: ${min}-${max})`)

  if (words < min) {
    return trimmed + ' What do you think? 🌿'
  }

  if (words > max + 15) {
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || []
    let result = ''

    for (const sentence of sentences) {
      const potentialResult = result + (result ? ' ' : '') + sentence
      const potentialWords = potentialResult.split(/\s+/).length

      if (potentialWords <= max + 20) {
        result = potentialResult
      } else {
        break
      }
    }

    if (result) {
      return result
    }

    const firstSentence = sentences[0] || trimmed
    if (!firstSentence.match(/[.!?]$/)) {
      return firstSentence + '.'
    }
    return firstSentence
  }

  return trimmed
}

/**
 * Ensures text ends with complete sentences only (no cliffhangers like trailing em dash).
 */
export function ensureCompleteSentences(text: string): string {
  let t = text.trim()
  if (!t) return t

  if (t.endsWith('—')) {
    t = t.slice(0, -1).trim()
  }

  const sentences = t.match(/[^.!?]+[.!?]+/g) || []
  if (sentences.length === 0) {
    return t + (t.match(/[.!?]$/) ? '' : '.')
  }

  return sentences.join(' ')
}

/**
 * Applies word count limits with a buffer to ensure complete sentences.
 * @deprecated Prefer enforceWordCount + ensureCompleteSentences for soft guidelines.
 */
export function applyWordCountWithBuffer(
  text: string,
  maxWords: number,
  type: InsightType
): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const words = trimmed.split(/\s+/).length

  if (words <= maxWords) {
    return ensureCompleteInsight(trimmed, type)
  }

  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || []
  let result = ''

  for (const sentence of sentences) {
    const candidate = result ? result + ' ' + sentence : sentence
    const newLength = candidate.split(/\s+/).length
    if (newLength <= maxWords) {
      result = candidate
    } else {
      break
    }
  }

  const first = sentences[0]
  if (!result && first) {
    const truncated = first.split(/\s+/).slice(0, maxWords).join(' ')
    return ensureCompleteInsight(truncated, type)
  }

  return result ? ensureCompleteInsight(result, type) : ensureCompleteInsight(trimmed.slice(0, maxWords * 8), type)
}
