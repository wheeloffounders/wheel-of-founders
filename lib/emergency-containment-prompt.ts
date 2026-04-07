import type { EmergencyTriageJson, EmergencyTriageStrategy } from '@/lib/types/emergency-triage'

/** Remove repeated "1.", "2)", etc. so UI checkboxes don't duplicate AI numbering. */
function stripLeadingEnumerators(line: string): string {
  let s = line.trim()
  while (/^\d+\s*[\.\)\:]\s*/.test(s)) {
    s = s.replace(/^\d+\s*[\.\)\:]\s*/, '').trim()
  }
  return s
}

/** Split containment plan text into checklist lines (same rules as emergency UI). */
export function parseContainmentSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .map(stripLeadingEnumerators)
    .filter(Boolean)
}

/**
 * Strategy-first “flashlight” question for the tactical response empty state.
 * `description` is reserved for future context (e.g. severity or keyword hints).
 */
export function getDynamicPlaceholder(
  strategy: EmergencyTriageStrategy | null | undefined,
  _description: string
): string {
  switch (strategy) {
    case 'pivot':
      return 'What is the absolute minimum “Good Enough” version we can ship by 5 PM to buy us 24 hours?'
    case 'hold':
      return 'What is the one sentence we need to tell the stakeholders so they feel safe while we pause this?'
    case 'drop':
      return 'What is the “Clean Break” move? Who needs to know this is dead, and what do we do with the remains?'
    default:
      return 'If you could only do two things to stop the bleeding in the next 30 minutes, what are they?'
  }
}

/**
 * Short, tactical textarea hint (placeholder) — not the strategic question.
 * Keeps the field feeling like a workbench, not a duplicate of the label.
 */
export function getTacticalHint(strategy: EmergencyTriageStrategy | null | undefined): string {
  switch (strategy) {
    case 'pivot':
      return 'List your next 2–3 moves, one per line.'
    case 'hold':
      return 'Draft your communication steps here — one line per beat.'
    case 'drop':
      return 'Who needs to know, and what happens to open work — one line each.'
    default:
      return 'List 2–3 moves, one per line — short is fine.'
  }
}

/** Same as {@link getDynamicPlaceholder}(triage?.strategy, description) — convenience when you have triage JSON. */
export function getTacticalContainmentPrompt(
  fireDescription: string,
  triage: EmergencyTriageJson | null
): string {
  return getDynamicPlaceholder(triage?.strategy ?? null, fireDescription)
}
