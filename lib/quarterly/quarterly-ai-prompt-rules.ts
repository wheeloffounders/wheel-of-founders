/**
 * Shared copy for quarterly insight generation (cron + dev refresh API).
 * Grounds synthesis in user data and blocks repetitive LLM filler.
 */

export const QUARTERLY_FORBID_SEAT_PHRASE =
  'FORBIDDEN PHRASE: Do not write "When life had a seat at the table" (or close paraphrase) anywhere. It reads as a template, not their life.'

export const QUARTERLY_UNIQUE_MONTH_HOOKS =
  'If you name months or subsections, each month needs a DIFFERENT 4–7 word title grounded in that month’s actual wins/lessons from BY MONTH above (specific objects, people, or moves)—never the same title for January, February, and March.'

/** Hard ban on poetic “thread / weaving / balance” filler the model overuses. */
export const QUARTERLY_FORBIDDEN_LLMSMS = `FORBIDDEN PHRASES & STRUCTURES (never use, even once):
- "The thread underneath…" or any sentence built around "the thread" as metaphor
- "...showing up beside it" / "kept showing up beside it"
- "That's [noun] — in yourself…" / "That's trust — in yourself…" style epigrams
- "weaving through" / "not balance, but weaving"
- Generic "balance between [X] and [Y]" as a moral (if you compare two areas, cite their actual wins, not a proverb)`

export const QUARTERLY_GROUNDED_SYNTHESIS = `MONTH-LEVEL SYNTHESIS: Do not reuse the same closing sentence across months. Each month’s takeaway must cite concrete evidence from that month’s wins/lessons strings in BY MONTH (paraphrase ok; inventing is not). Prefer plain, specific observations over metaphors (thread, weave, seat at the table, tapestry). If two themes appear, say what actually showed up in the entries—not a universal life lesson.`

export const QUARTERLY_JUDGE_AGAINST_INTENTION = `When you interpret the quarter, weigh progress against CURRENT STRATEGIC LENS (Quarterly Intention) when it is set—not a generic idea of "balance" or "integration." If intention is unset, lean on GOAL + the month data only.`

export function quarterlyStrategicLensBlock(quarterlyIntention: string | null | undefined): string {
  const q = (quarterlyIntention ?? '').trim()
  return `CURRENT STRATEGIC LENS (Quarterly Intention from profile): ${q || '(not set yet)'}\n${QUARTERLY_JUDGE_AGAINST_INTENTION}`
}

export function quarterlyInsightPromptExtra(): string {
  return `\n\n${QUARTERLY_FORBID_SEAT_PHRASE}\n${QUARTERLY_UNIQUE_MONTH_HOOKS}\n\n${QUARTERLY_FORBIDDEN_LLMSMS}\n\n${QUARTERLY_GROUNDED_SYNTHESIS}`
}
