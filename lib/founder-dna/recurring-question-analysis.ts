import type { RecurringQuestionItem, RecurringQuestionResponse } from '@/lib/types/founder-dna'

function normalizeQuestion(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim().toLowerCase()
  s = s.replace(/^i wonder (if |whether )?/i, '')
  s = s.replace(/^i keep asking (myself )?/i, '')
  s = s.replace(/^i('m| am) (always |constantly )?asking (myself )?/i, '')
  if (!s.endsWith('?')) s = `${s}?`
  if (s.length > 180) s = `${s.slice(0, 177)}…?`
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Pull question-shaped strings from free text (lessons, decision whys). */
export function extractQuestionsFromText(text: string): string[] {
  if (!text || text.trim().length < 4) return []
  const seen = new Set<string>()

  const add = (raw: string) => {
    const q = normalizeQuestion(raw)
    if (q.length >= 14 && q.length <= 200) seen.add(q)
  }

  const chunks = text.split('?')
  for (let i = 0; i < chunks.length - 1; i++) {
    const before = chunks[i] ?? ''
    const tail = before.replace(/\s+/g, ' ').trim()
    const start = Math.max(0, tail.length - 140)
    const fragment = tail.slice(start).trim()
    add(`${fragment}?`)
  }

  const inline = text.match(
    /\b(?:why|how|what|when|where|who|am i|should i|do i|is it|can i|will i|are we|is this)[^.!?\n]{10,120}\?/gi
  )
  if (inline) {
    for (const m of inline) add(m.trim())
  }

  return [...seen]
}

function observationForQuestion(q: string): string {
  const lower = q.toLowerCase()
  if (/\b(enough|good enough|measuring up|deserve)\b/.test(lower)) {
    return 'Questions like this often track worth and pace. Mrs. Deer notices them without fixing you — many founders carry this thread while still doing meaningful work.'
  }
  if (/\b(next|right (thing|move)|priority|focus on)\b/.test(lower)) {
    return 'This sounds like your mind scanning for the next lever. Naming it repeatedly can mean you care deeply about direction — not that you’re lost.'
  }
  if (/\b(wrong|mistake|fail|screw)\b/.test(lower)) {
    return 'Self-check questions can be harsh. If this one loops often, you might experiment with one kinder rephrase on paper and see if the tone shifts.'
  }
  if (/\b(time|too late|when will)\b/.test(lower)) {
    return 'Timing questions are heavy. They often sit next to ambition — you’re holding the future tightly, which is very human.'
  }
  if (/\b(they|team|people|anyone)\b/.test(lower)) {
    return 'This points outward — relationships, perception, or alignment. Worth noticing whether you’re seeking clarity or seeking certainty you can’t fully control.'
  }
  return 'Mrs. Deer sees this as a thread your mind returns to. There’s no single “fix” — curiosity about the pattern is already a form of care.'
}

export function computeRecurringQuestions(input: {
  lessonTexts: string[]
  whyTexts: string[]
  /** Total evening rows scanned (for display). */
  lessonRowCount: number
  /** Total decision rows scanned (for display). */
  whyRowCount: number
}): RecurringQuestionResponse {
  const counts = new Map<string, number>()
  for (const blob of input.lessonTexts) {
    for (const q of extractQuestionsFromText(blob)) {
      counts.set(q, (counts.get(q) ?? 0) + 1)
    }
  }
  for (const blob of input.whyTexts) {
    for (const q of extractQuestionsFromText(blob)) {
      counts.set(q, (counts.get(q) ?? 0) + 1)
    }
  }

  const questions: RecurringQuestionItem[] = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([question, count]) => ({
      question,
      count,
      observation: observationForQuestion(question),
    }))

  const intro =
    questions.length > 0
      ? 'Mrs. Deer listened for questions that echo across your reflections — the ones that come back like a familiar footstep.'
      : 'She hasn’t found a question that repeats clearly yet. A few more evenings (and “why” lines on decisions) will sharpen this signal.'

  return {
    intro,
    questions,
    eveningsSampled: input.lessonRowCount,
    decisionsSampled: input.whyRowCount,
  }
}
