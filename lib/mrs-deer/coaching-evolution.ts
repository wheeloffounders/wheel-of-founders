/**
 * Mrs. Deer coaching evolution: relationship phases, daily response rotation,
 * tenure-based brevity, and weekly/monthly arc-oriented prompts.
 */

import { NO_LABELS, BANNED_BASE, GLOBAL_FREQUENCY_RULES, COMPLETE_THOUGHT_RULES } from '@/lib/mrs-deer-prompts'

export type MrsDeerRelationshipPhase = 'new' | 'building' | 'familiar' | 'long_haul'

export type DailyInsightKind = 'morning' | 'post_morning' | 'post_evening'

export type DailyResponseShapeId =
  | 'mirror_quote'
  | 'sharp_observation'
  | 'gentle_question'
  | 'celebrate_space'
  | 'pattern_nudge'

export type DailyWordBudget = {
  min: number
  max: number
  /** How often to end with an open reframing question */
  questionLikelihood: 'always' | 'often' | 'sometimes' | 'rare'
}

const PHASE_DAY_THRESHOLDS = {
  building: 14,
  familiar: 45,
  long_haul: 90,
} as const

export function getRelationshipPhase(daysWithEntries: number): MrsDeerRelationshipPhase {
  if (daysWithEntries < PHASE_DAY_THRESHOLDS.building) return 'new'
  if (daysWithEntries < PHASE_DAY_THRESHOLDS.familiar) return 'building'
  if (daysWithEntries < PHASE_DAY_THRESHOLDS.long_haul) return 'familiar'
  return 'long_haul'
}

function stableHash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pickFromPool<T>(seed: string, pool: readonly T[]): T {
  if (pool.length === 0) throw new Error('pickFromPool: empty pool')
  return pool[stableHash(seed) % pool.length]!
}

const DAILY_SHAPES_BY_PHASE: Record<MrsDeerRelationshipPhase, readonly DailyResponseShapeId[]> = {
  new: ['mirror_quote', 'gentle_question', 'celebrate_space'],
  building: ['mirror_quote', 'gentle_question', 'sharp_observation', 'celebrate_space'],
  familiar: ['sharp_observation', 'mirror_quote', 'gentle_question', 'pattern_nudge', 'celebrate_space'],
  long_haul: ['sharp_observation', 'pattern_nudge', 'mirror_quote', 'gentle_question', 'celebrate_space'],
}

const SHAPE_INSTRUCTIONS: Record<DailyResponseShapeId, string> = {
  mirror_quote: `RESPONSE SHAPE — Mirror & quote:
- Open with one specific observation using their exact words (short quote).
- Validate in one sentence only if mood/energy or their text calls for it.
- Optional: one light reframe (half sentence).
- End with ONE open question (complete sentence).`,

  sharp_observation: `RESPONSE SHAPE — Sharp observation:
- 2–4 short sentences total. No bullet lists.
- Lead with the most specific thing you noticed (quote a phrase).
- You may offer one line to sit with tonight — NOT a big coaching question.
- Do NOT use the formula "What would it feel like if…" unless truly fresh.`,

  gentle_question: `RESPONSE SHAPE — Question-led:
- One sentence of observation (quote them).
- One sentence validating or naming the tension.
- End with ONE curious question that points forward (complete, specific).`,

  celebrate_space: `RESPONSE SHAPE — Celebrate space:
- Match calm or light energy. Do not invent struggle.
- Notice what they made room for (rest, clarity, small win).
- Optional soft question OR a warm closing line — not both if word budget is tight.`,

  pattern_nudge: `RESPONSE SHAPE — Pattern nudge (arc-aware):
- Start from TODAY's entry (quote them).
- You may add AT MOST one sentence connecting to an ongoing thread from FOUNDER THEMES — only if clearly relevant.
- Never open with "As we discussed" or "Remember when". No lecture.
- End with one short question OR one line to carry — pick one.`,
}

export function getDailyWordBudget(
  phase: MrsDeerRelationshipPhase,
  kind: DailyInsightKind
): DailyWordBudget {
  const eveningExtra = kind === 'post_evening' ? 15 : 0
  switch (phase) {
    case 'new':
      return {
        min: kind === 'post_morning' ? 70 : 80,
        max: (kind === 'post_evening' ? 150 : 120) + eveningExtra,
        questionLikelihood: 'always',
      }
    case 'building':
      return {
        min: 70,
        max: kind === 'post_evening' ? 145 : 115,
        questionLikelihood: 'often',
      }
    case 'familiar':
      return {
        min: 55,
        max: kind === 'post_evening' ? 130 : 100,
        questionLikelihood: 'sometimes',
      }
    case 'long_haul':
      return {
        min: 45,
        max: kind === 'post_evening' ? 115 : 85,
        questionLikelihood: 'rare',
      }
  }
}

export function pickDailyResponseShape(params: {
  userId: string
  kind: DailyInsightKind
  targetDate: string
  phase: MrsDeerRelationshipPhase
  allowArcSprinkle: boolean
}): { shapeId: DailyResponseShapeId; instructions: string } {
  const pool = [...DAILY_SHAPES_BY_PHASE[params.phase]]
  const filtered =
    params.allowArcSprinkle && params.phase !== 'new'
      ? pool
      : pool.filter((id) => id !== 'pattern_nudge')
  const seed = `${params.userId}:${params.kind}:${params.targetDate}:daily_shape`
  const shapeId = pickFromPool(seed, filtered.length > 0 ? filtered : pool)
  return { shapeId, instructions: SHAPE_INSTRUCTIONS[shapeId] }
}

/** ~1 in 5 eligible days for familiar+ users when themes or repeated lessons exist */
export function shouldAllowArcSprinkleOnDaily(params: {
  userId: string
  targetDate: string
  phase: MrsDeerRelationshipPhase
  hasRepeatingLessonSignal: boolean
  hasFounderThemes: boolean
}): boolean {
  if (params.phase === 'new' || params.phase === 'building') return false
  if (!params.hasRepeatingLessonSignal && !params.hasFounderThemes) return false
  const weekBucket = params.targetDate.slice(0, 7)
  const h = stableHash(`${params.userId}:${weekBucket}:arc_sprinkle`)
  return h % 5 === 0
}

export function buildTenureVoiceAddendum(phase: MrsDeerRelationshipPhase): string {
  switch (phase) {
    case 'new':
      return `\nRELATIONSHIP PHASE (new): They are early. Mirror today only. Do not claim long-term patterns.`
    case 'building':
      return `\nRELATIONSHIP PHASE (building trust): Be specific. Vary sentence openings. Avoid repeating the same closing question style two days in a row.`
    case 'familiar':
      return `\nRELATIONSHIP PHASE (familiar): You know them. Be concise. Skip obvious validation. Surprise with one detail they did not headline.`
    case 'long_haul':
      return `\nRELATIONSHIP PHASE (long haul): Speak like someone who has read their journal for months. Shorter. Direct. You may name a repeat tension plainly — without a sermon.`
  }
}

export function buildDailyStructurePrompt(params: {
  kind: DailyInsightKind
  phase: MrsDeerRelationshipPhase
  shapeInstructions: string
  wordBudget: DailyWordBudget
}): string {
  const { kind, phase, shapeInstructions, wordBudget } = params
  const kindLabel =
    kind === 'morning' ? 'Morning' : kind === 'post_morning' ? 'Post-morning plan review' : 'Evening'

  const questionRule =
    wordBudget.questionLikelihood === 'always'
      ? 'End with ONE complete open question unless the response shape says otherwise.'
      : wordBudget.questionLikelihood === 'often'
        ? 'Usually end with ONE open question; skip if the shape is "sharp observation" or "celebrate space".'
        : wordBudget.questionLikelihood === 'sometimes'
          ? 'Include a question only if it adds something new; sharp observation days may end without one.'
          : 'Questions are optional. Prefer a memorable closing line over a generic reframe question.'

  return `You are Mrs. Deer. ${kindLabel} insight: ${wordBudget.min}-${wordBudget.max} words.
${shapeInstructions}
${questionRule}
MUST use at least one exact phrase from their entry when data exists.
Do NOT use section labels (Observe/Validate/Reframe).${NO_LABELS}${BANNED_BASE}${GLOBAL_FREQUENCY_RULES}${COMPLETE_THOUGHT_RULES}${buildTenureVoiceAddendum(phase)}`
}

export function buildWeeklyArcSystemPrompt(phase: MrsDeerRelationshipPhase): string {
  const arcDepth =
    phase === 'new' || phase === 'building'
      ? 'Name one thread across the week. Do not invent history beyond the data provided.'
      : 'Connect this week to FOUNDER THEMES when relevant — one arc sentence, then ground in their quotes.'

  return `You are Mrs. Deer. Weekly insight (arc mode): max 200 words OR 4 short ## sections (pick one format — not both).

JOB: Connect the dots for the week — one pattern, one tension, one forward thread.
${arcDepth}

STRUCTURE (pick format A or B):
Format A — flowing prose: pattern → validate → light reframe → one question for next week.
Format B — ## headers (4 max): e.g. What stood out | The thread | What shifted | Carrying forward.

MUST quote at least one exact phrase from their week.
Optional: one gentle "experiment for next week" sentence (not a to-do list).
${NO_LABELS}${BANNED_BASE}`
}

export function buildMonthlyChapterSystemPrompt(phase: MrsDeerRelationshipPhase): string {
  const adviceBeat =
    phase === 'long_haul' || phase === 'familiar'
      ? 'Include ONE short "practical beat": 1–2 optional directions for next month (framed as choices, not orders).'
      : 'Optional: one forward-looking question for next month; avoid prescriptive advice lists.'

  return `You are Mrs. Deer. Monthly insight (chapter mode): max 280 words in 4–6 ## sections with blank lines between.

JOB: Name the chapter of their month — one dominant theme, one shift (early vs late month if visible), one honest tension.
Use FOUNDER THEMES when provided — this is where arc memory belongs.
${adviceBeat}

Sections (warm natural titles, not these labels verbatim): The month's shape | What kept echoing | A deeper thread | Carrying into next month.
MUST quote at least one exact phrase from their month.
${NO_LABELS}${BANNED_BASE}`
}

export function questionLikelihoodHint(likelihood: DailyWordBudget['questionLikelihood']): string {
  switch (likelihood) {
    case 'always':
      return 'End with ONE complete open question.'
    case 'often':
      return 'Usually end with ONE open question unless your shape says otherwise.'
    case 'sometimes':
      return 'A question is optional — only if it earns its place.'
    case 'rare':
      return 'Skip generic reframe questions; prefer a specific closing line.'
  }
}
