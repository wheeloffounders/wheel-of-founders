import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAIPrompt, PRO_MORNING_MODEL_CANDIDATES } from '@/lib/ai-client'
import {
  inferDecisionSignalProfile,
  mergeStrategiesWithFallback,
  parseDecisionStrategies,
} from '@/lib/morning/decision-strategies-shared'
import {
  fetchProOracleContext,
  type DecisionStrategyOption,
} from '@/lib/morning/pro-morning-oracle'

export type EveningBridgeForStrategies = {
  reviewDate: string
  mood: number | null
  energy: number | null
  wins: string[]
  lessons: string[]
  journal: string | null
}

function moodEnergyLine(mood: number | null, energy: number | null): string {
  const m =
    mood != null && mood >= 1 && mood <= 5
      ? `Mood score: ${mood}/5 (higher = brighter / more uplifted).`
      : 'Mood: not recorded.'
  const e =
    energy != null && energy >= 1 && energy <= 5
      ? `Energy score: ${energy}/5 (higher = more capacity today).`
      : 'Energy: not recorded.'
  return `${m}\n${e}`
}

function formatEveningBridgeBlock(bridge: EveningBridgeForStrategies): string {
  const wins = bridge.wins.map((w) => w.trim()).filter(Boolean).slice(0, 6)
  const lessons = bridge.lessons.map((l) => l.trim()).filter(Boolean).slice(0, 6)
  const journal = (bridge.journal ?? '').trim()
  const excerpt = journal.length > 420 ? `${journal.slice(0, 417)}…` : journal
  const winsLine = wins.length ? wins.map((w) => `“${w.replace(/"/g, "'")}”`).join('; ') : '(none listed)'
  const lessonsLine = lessons.length
    ? lessons.map((l) => `“${l.replace(/"/g, "'")}”`).join('; ')
    : '(none listed)'
  return `YESTERDAY'S REFLECTION (completed ${bridge.reviewDate} — they just finished this before bed).
Use it to tune tomorrow morning's three options: sound human, specific, and honest. Bridge gently from how they felt to how they might show up today. Do not invent facts beyond this block.

${moodEnergyLine(bridge.mood, bridge.energy)}
Wins they named: ${winsLine}
Lessons they named: ${lessonsLine}
Journal excerpt: ${excerpt ? excerpt.replace(/\s+/g, ' ') : '(empty or not written)'}

In each card's "reasoning", you may nod once to this reflection when natural (e.g. low energy + a named win → protect the win while recovering bandwidth).`
}

/**
 * Pro Mrs. Deer decision strategy tray (3 cards). Optional evening bridge weights copy toward how they just closed the day.
 */
export async function generateProDecisionStrategies(
  db: SupabaseClient,
  userId: string,
  planDate: string,
  eveningBridge?: EveningBridgeForStrategies | null
): Promise<DecisionStrategyOption[]> {
  const ctx = await fetchProOracleContext(db, userId, planDate)
  const signal = inferDecisionSignalProfile(ctx)
  const hintsBlock =
    ctx.postponementTaskHints.length > 0
      ? `\nRecent postponed task titles (newest first, last 14 days):\n${ctx.postponementTaskHints.map((h) => `- ${h}`).join('\n')}`
      : ''

  const quarterlyIntention = ctx.quarterlyIntention || '(not set)'
  const primaryGoal = ctx.primaryGoal || '(not set)'

  const summary = [
    `Target morning plan date: ${planDate}.`,
    `App current_streak (journey): ${ctx.currentStreak} days.`,
    `Quarterly intention: ${quarterlyIntention}`,
    `Primary goal: ${primaryGoal}`,
    `Last 14 days — distinct evenings with a review: ${ctx.eveningDaysLast14}; distinct mornings with tasks: ${ctx.activeMorningDaysLast14}; task postponements count: ${ctx.postponementsLast14}.`,
    hintsBlock,
  ]
    .filter(Boolean)
    .join('\n')

  const systemPrompt = `You are Mrs. Deer, the founder's strategic companion in Wheel of Founders.
Return ONLY a raw JSON array of exactly 3 objects. No Markdown, no code fences (never \`\`\`json), no preamble, no postscript. The first character of your reply must be "[" and the last must be "]".
Each object must have these string keys:
- "label" (2–4 words, punchy card title)
- "text" (one clear sentence: the daily pivot they could adopt today, second person "you")
- "reasoning" (one short sentence explaining why this angle fits THEIR data—cite streak, evenings, mornings, postponements, or last night's reflection when relevant; never invent facts not in context)
- "recommended_action" OR "action_type" (same value; use one key per object—exactly one of: milestone, systemize, delegate, let_go, quick_win — the leadership layer that best matches THIS card)
- "action_type_why" (one short sentence: objective Chief-of-Staff style—why that mode fits their pattern for this card; cite postponements, rhythm, or streak when in context; never invent facts)

Use snake_case for action_type_why. For the matrix key prefer "recommended_action" if you use only one key.`

  const streakInstruction =
    ctx.currentStreak === 0
      ? `CRITICAL: This is a new user (streak 0 in app). Do NOT invent problems, delays, or personality labels they do not have. Focus on establishing a clear, kind intention for Day 1.`
      : ctx.currentStreak >= 1
        ? `Their consistency streak in the app is ${ctx.currentStreak} days — you may nod to showing up without sounding like a scoreboard.`
        : ''

  const signalBlock =
    signal === 'low'
      ? `SIGNAL PROFILE: LOW / THIN DATA.
Themes for the three options (one card each, distinct): Foundational clarity · Primary goal alignment · Energy / bandwidth honesty.
Do not imply they have a backlog crisis or invented archetypes. Stay grounded.`
      : signal === 'friction'
        ? `SIGNAL PROFILE: DELAYS / FRICTION (postponements elevated).
Themes: Breaking the logjam · Simplifying scope to something shippable today · The uncomfortable task they've been avoiding.
Use postponement hints only when provided—don't invent task names.`
        : signal === 'steady'
          ? `SIGNAL PROFILE: STEADY PROGRESS (strong morning + evening rhythm).
Themes: Scaling momentum · Optimization of what's working · Future-proofing / risk reduction.
Tone: they're in rhythm; options can be a bit bolder.`
          : `SIGNAL PROFILE: MIXED.
Offer three genuinely different angles (e.g. conservative pivot vs balanced vs bolder bet) so they can choose intensity. Stay honest to the numbers—no fake crises.`

  const bridgeBlock =
    eveningBridge && eveningBridge.reviewDate
      ? `\n\n${formatEveningBridgeBlock(eveningBridge)}`
      : ''

  const userPrompt = `${streakInstruction}

${signalBlock}
${bridgeBlock}

LEADERSHIP LAYER (recommended_action / action_type) — apply with the data you were given:
- If postponements in the last 14 days are 3 or more: at least one card should lean let_go or quick_win (permission to shrink, ship a tiny slice, or drop noise).
- If the angle sounds like repeating work or rhythm optimization: prefer systemize for that card.
- If the angle sounds like hands-on technical or low-level execution the founder should not own: prefer delegate for that card.
- Otherwise milestone (my_zone) is appropriate for executive judgment they must keep.

Context:
${summary}

Return exactly 3 objects. "text" must be copy-paste ready as their daily decision sentence. Do not mention "AI", "model", or "JSON".`

  const raw = await generateAIPrompt({
    models: PRO_MORNING_MODEL_CANDIDATES,
    temperature: 0.65,
    systemPrompt,
    userPrompt,
    maxTokens: 560,
  })

  const parsed = parseDecisionStrategies(raw)
  return mergeStrategiesWithFallback(parsed, ctx)
}
