/**
 * Footer micro-lesson button UX: classify copy so actions match intent (not Yes/No on reflections).
 */
export type FooterMessageCategory =
  | 'reflection'
  | 'encouragement'
  | 'action_prompt'
  | 'challenge'
  | 'informational'
  | 'struggle_tip'

const REFLECTION_SNIPPETS = [
  'what made today count',
  'made today count',
  'what surprised you',
  'what would you do differently',
  'meaningful businesses start with meaningful days',
  'what drained your',
  'what energized you',
  'how did today feel',
  "one thing you'd change",
  'what would you adjust',
  'what felt true',
  'what are you avoiding naming',
]

/** Looks like a yes/no readiness question, not an open reflection */
function isBinaryStyleQuestion(lower: string): boolean {
  return /\b(ready to|want to|would you like|did you|can you|will you)\b.*\?/.test(lower)
}

export function classifyFooterMicroLesson(
  message: string,
  kind?: 'state' | 'struggle',
  hasActionLink?: boolean
): FooterMessageCategory {
  if (kind === 'struggle') return 'struggle_tip'

  const m = message.trim()
  const lower = m.toLowerCase()

  if (REFLECTION_SNIPPETS.some((s) => lower.includes(s))) {
    return 'reflection'
  }

  if (/\?/.test(m)) {
    if (isBinaryStyleQuestion(lower)) {
      return hasActionLink ? 'action_prompt' : 'informational'
    }
    // Open-ended reflection prompts usually start with What/How/Why or contain "what "
    if (/^(what|how|why|when)\b/i.test(m) || /\bwhat\s/.test(lower) || /\bhow\s/.test(lower)) {
      return 'reflection'
    }
  }

  if (
    /\b\d+\s*[- ]?\s*day(s)?\b.*\b(streak|practice|rhythm)\b/i.test(lower) ||
    /\bstreak\b/i.test(lower) ||
    /\b(you completed|nice work|well done|celebrate)\b/i.test(lower) ||
    /^\s*🎉/.test(m)
  ) {
    return 'encouragement'
  }

  if (
    lower.includes('start your morning') ||
    lower.includes('complete the loop') ||
    lower.includes('morning plan') ||
    lower.includes('head to morning') ||
    (lower.includes('evening') && (lower.includes('try') || lower.includes('open') || lower.includes('complete')))
  ) {
    return 'action_prompt'
  }

  if (
    lower.includes('name one win') ||
    lower.includes('one win you almost') ||
    lower.includes('challenge') ||
    /\bname one\b/.test(lower)
  ) {
    return 'challenge'
  }

  if (hasActionLink) {
    return 'action_prompt'
  }

  return 'informational'
}
