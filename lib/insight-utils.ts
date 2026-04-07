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

/** Core phrase for the quarterly card — AI often echoes this as markdown under the UI title. */
const QUARTER_IN_ONE_GLANCE = String.raw`the\s+quarter\s+in\s+one\s+glance`

/**
 * Removes leading lines that duplicate UI card titles (headings, bold, or plain).
 * Repeats until stable so stacked duplicate headers are cleared.
 */
export function stripRedundantLeadingHeadings(text: string): string {
  let t = text.trimStart()
  const patterns: RegExp[] = [
    // "## **The Quarter in One Glance**" / "# **...**"
    new RegExp(
      `^#{1,6}\\s*\\*{1,2}\\s*${QUARTER_IN_ONE_GLANCE}\\s*\\*{1,2}\\s*(?:\\n+|$)`,
      'i'
    ),
    new RegExp(`^#{1,6}\\s*${QUARTER_IN_ONE_GLANCE}\\s*(?:\\n+|$)`, 'i'),
    new RegExp(`^\\*{1,2}\\s*${QUARTER_IN_ONE_GLANCE}\\s*\\*{1,2}\\s*(?:\\n+|$)`, 'i'),
    new RegExp(`^_{1,2}\\s*${QUARTER_IN_ONE_GLANCE}\\s*_{1,2}\\s*(?:\\n+|$)`, 'i'),
    new RegExp(`^${QUARTER_IN_ONE_GLANCE}\\s*(?:\\n+|$)`, 'i'),
    /^#{1,6}\s*quarterly\s*trajectory\s*(?:\n+|$)/i,
    /^quarterly\s*trajectory\s*(?:\n+|$)/i,
    // Canned quarterly month hook (see buildQuarterlyNarrative / AI prompts)
    /^#{1,6}\s*[^\n]*when\s+life\s+had\s+a\s+seat\s+at\s+the\s+table[^\n]*(?:\n+|$)/i,
    /^\*{1,2}\s*[^\n]*when\s+life\s+had\s+a\s+seat\s+at\s+the\s+table[^\n]*\*{1,2}\s*(?:\n+|$)/i,
  ]

  for (let i = 0; i < 20; i++) {
    const start = t
    for (const re of patterns) {
      const m = t.match(re)
      if (m) {
        t = t.slice(m[0].length).trimStart()
        break
      }
    }
    if (t === start) break
  }
  return t
}

/**
 * @deprecated Prefer {@link stripRedundantLeadingHeadings} — same behavior, broader title coverage.
 * Drops duplicate "Quarterly Trajectory" / "The Quarter in One Glance" style lead lines.
 */
export function stripLeadingQuarterlyTrajectoryHeading(text: string): string {
  return stripRedundantLeadingHeadings(text)
}

const MONTH_NAME_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i

/**
 * Rewrites headings (or bold-only lines) that use the old canned month title; replaces with
 * "{Month} progress" when a month name appears on the line or in the prior markdown heading.
 * Also softens any remaining phrase occurrences in body text.
 */
export function scrubBannedQuarterlyTemplatePhrases(markdown: string): string {
  if (!/when\s+life\s+had\s+a\s+seat\s+at\s+the\s+table/i.test(markdown)) {
    return markdown
  }

  const lines = markdown.split('\n')
  let lastMonth: string | null = null

  const next = lines.map((line) => {
    const hm = line.match(/^#{1,6}\s*(.*)$/)
    if (hm) {
      const inner = hm[1] ?? ''
      const mm = inner.match(MONTH_NAME_RE)
      if (mm) lastMonth = mm[1]!
    }

    if (!/when\s+life\s+had\s+a\s+seat\s+at\s+the\s+table/i.test(line)) {
      return line
    }

    const fromLine = line.match(MONTH_NAME_RE)
    const label = (fromLine?.[1] ?? lastMonth) ?? 'This chapter'

    if (/^#{1,6}\s/.test(line)) {
      const prefix = line.match(/^#{1,6}\s*/)?.[0] ?? '## '
      return `${prefix}${label} progress`
    }

    const t = line.trim()
    if (t.startsWith('**') && t.endsWith('**') && t.length < 120) {
      return `**${label} progress**`
    }

    return line.replace(
      /when\s+life\s+had\s+a\s+seat\s+at\s+the\s+table/gi,
      'the weeks where home and the work both had real room'
    )
  })

  return next.join('\n')
}

/**
 * Removes canned “thread / weaving / balance proverb” sentences from AI markdown (fail-safe).
 */
export function scrubGenericSynthesisTransitions(text: string): string {
  if (!text.trim()) return text
  const sentenceKillers: RegExp[] = [
    /\bthe\s+thread\s+underneath[^.!?\n]*[.!?]+/gi,
    /\b[^\n.!?]*\bkept\s+showing\s+up\s+beside\s+it[^.!?\n]*[.!?]+/gi,
    /\bthe\s+real\s+shift\s+was\s+quieter\s+than\s+the\s+headlines[^.!?\n]*[.!?]+/gi,
    /\bthat'?s\s+[^.!?\n]{1,100}—\s*in\s+yourself[^.!?\n]*[.!?]+/gi,
    /\bthat'?s\s+the\s+beginning\s+of\s+integration[^.!?\n]*[.!?]+/gi,
    /\bweaving\s+through[^.!?\n]*[.!?]+/gi,
    /\bnot\s+balance,\s*but\s+weaving[^.!?\n]*[.!?]?/gi,
    /\bbalance\s+between\s+.{8,120}\s+and\s+.{8,120}[.!?]+/gi,
  ]

  let t = text
  for (const re of sentenceKillers) {
    t = t.replace(re, ' ')
  }
  return t
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
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
