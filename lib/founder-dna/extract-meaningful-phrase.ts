/**
 * Parse wins/lessons columns from evening_reviews (JSON string arrays).
 */
export function parseEveningStringArrayField(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
  }
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p)
      ? p.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

const MAX_QUOTED_PHRASE_CHARS = 100

function clipQuotedPhrase(s: string): string {
  const t = s.trim()
  if (t.length <= MAX_QUOTED_PHRASE_CHARS) return t
  return `${t.slice(0, MAX_QUOTED_PHRASE_CHARS - 3).trim()}...`
}

/**
 * Pull a short, quotable thread from the user's first evening reflection for First Glimpse.
 */
export function extractMeaningfulPhrase(
  journal: string,
  wins: string[],
  lessons: string[],
): string | null {
  const j = journal.replace(/\s+/g, ' ').trim()

  if (j) {
    const firstSentence = j.split(/[.!?]/)[0]?.trim() ?? ''
    if (firstSentence.length > 10 && firstSentence.length < 80) {
      return clipQuotedPhrase(firstSentence)
    }
    const words = j.split(/\s+/).filter(Boolean).slice(0, 8).join(' ')
    if (words.length > 5) return clipQuotedPhrase(`${words}...`)
  }

  if (wins?.[0]?.trim()) return clipQuotedPhrase(wins[0])
  if (lessons?.[0]?.trim()) return clipQuotedPhrase(lessons[0])

  return null
}
