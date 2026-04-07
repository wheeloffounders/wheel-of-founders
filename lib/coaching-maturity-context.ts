import { differenceInCalendarDays, getISOWeek, getISOWeekYear } from 'date-fns'
import { QUARTERLY_INSIGHT_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

/** Day 45+ = strategic coaching with quarterly intention (matches quarterly page unlock). */
export const STRATEGIST_MIN_DAYS = QUARTERLY_INSIGHT_MIN_DAYS

export type CoachingMaturityStage = 'habit_builder' | 'strategist'

export function getIsoWeekId(d: Date = new Date()): string {
  const y = getISOWeekYear(d)
  const w = getISOWeek(d)
  return `${y}-W${String(w).padStart(2, '0')}`
}

export function computeDaysSinceSignup(createdAt: string | null | undefined): number {
  if (!createdAt) return 0
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return 0
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(t)))
}

export function getCoachingMaturityStage(daysSinceSignup: number): CoachingMaturityStage {
  return daysSinceSignup >= STRATEGIST_MIN_DAYS ? 'strategist' : 'habit_builder'
}

export type CoachingMaturityProfileRow = {
  created_at?: string | null
  primary_goal_text?: string | null
  quarterly_intention?: string | null
  north_star_last_quoted_iso_week?: string | null
}

/**
 * System-prompt block: habit vs strategy, quarterly rules, north-star repetition, human data.
 */
export function buildSmartContextSystemBlock(params: {
  daysSinceSignup: number
  primaryGoalText: string | null | undefined
  quarterlyIntention: string | null | undefined
  /** true if we already stored a verbatim north-star quote this ISO week */
  northStarAlreadyQuotedVerbatimThisWeek: boolean
}): string {
  const stage = getCoachingMaturityStage(params.daysSinceSignup)
  const goal = (params.primaryGoalText ?? '').trim()
  const quarterly = (params.quarterlyIntention ?? '').trim()

  const humanDataRule = `HUMAN DATA FIRST: Prefer grounding in mood, energy, wins, lessons, journal, rest, family, and life context from their actual entries over abstract goal talk. That keeps insights fresh and non-robotic.`

  const northStarRule = params.northStarAlreadyQuotedVerbatimThisWeek
    ? `NORTH STAR (PRIMARY GOAL): Do NOT quote or paste their primary goal text verbatim this calendar week. Paraphrase only (e.g. "what you said matters most", "the direction you care about").`
    : goal
      ? `NORTH STAR (PRIMARY GOAL): Quote their exact goal phrase at most once this week across all your messages; if you already used it verbatim recently, paraphrase. When in doubt, paraphrase.`
      : `NORTH STAR: They may not have a long-form goal on file—focus on what they wrote today.`

  if (stage === 'habit_builder') {
    return `
COACHING STAGE — HABIT BUILDER (days 1–${STRATEGIST_MIN_DAYS - 1} since signup):
- Focus on momentum, consistency, and daily "why" tied to their north star theme — without inventing a "Quarterly Intention" they have not earned yet.
- Do NOT ask about, assign, or reference a "quarterly intention" or "90-day mission" unless they bring it up unprompted.
- ${northStarRule}
- ${humanDataRule}
`.trim()
  }

  const qLine =
    quarterly.length > 0
      ? `Their ACTIVE 90-DAY MISSION (quarterly intention) is: "${quarterly}". Roughly 70% of strategic hooks should connect today's choices and tasks to this mission—not as a lecture, as useful linkage.`
      : `They have not set a quarterly intention yet; gently reinforce the daily loop and north star until they do—do not fabricate a quarterly goal.`

  return `
COACHING STAGE — STRATEGIST (day ${STRATEGIST_MIN_DAYS}+ since signup):
- ${qLine}
- Still anchor in human data (mood, energy, wins, lessons, life context), not only goals.
- ${northStarRule}
- ${humanDataRule}
`.trim()
}

export function northStarAlreadyQuotedThisWeek(row: CoachingMaturityProfileRow | null | undefined): boolean {
  const w = row?.north_star_last_quoted_iso_week?.trim()
  if (!w) return false
  return w === getIsoWeekId(new Date())
}

/** Detect if model output included the goal string verbatim (case-insensitive). */
export function textContainsVerbatimNorthStar(output: string, primaryGoalText: string | null | undefined): boolean {
  const g = primaryGoalText?.trim()
  if (!g || g.length < 4) return false
  return output.toLowerCase().includes(g.toLowerCase())
}
