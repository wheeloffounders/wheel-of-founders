import type { FounderJourneyCommandCenterPayload, ShadowArchetypeName } from '@/lib/admin/tracking'
import { generateUserStory } from '@/lib/admin/user-story-verdict'

/**
 * OpenRouter model order for admin strategic review — DeepSeek first (often reliable in HK /
 * restricted regions), then reasoner for heavier analysis, Llama 3.3 70B as fallback.
 */
export const STRATEGIC_ADVISOR_MODELS = [
  'deepseek/deepseek-chat',
  'deepseek/deepseek-reasoner',
  'meta-llama/llama-3.3-70b-instruct',
] as const

export const MRS_DEER_STRATEGIC_SYSTEM = `You are Mrs. Deer, the Lead Strategic Advisor for "Wheel of Founders." Your goal is to analyze founder engagement data and identify psychological friction.

Rules for your response:
1. Identify the **Most Critical Leak** (where the biggest percentage drop occurs between consecutive funnel stages).
2. **Segment by archetype** — e.g. "Visionaries are staying, but Builders are leaving" — using shadowSummary, cohort-level cohortShadowDistribution, retention slices, and pulse-batch pulseShadowDistribution.
3. Provide one **Tactical UX fix** and one **Voice of AI** copy shift (label them clearly).
4. Comment on the **Pulse chart**: use pulseShadowDistribution and pulseActivityByHourUtc. Example angle: clusters of Hustlers at late UTC hours who may treat the app as a panic dump vs a growth tool; tie to notifications or framing.
5. Maintain a sophisticated, sharp, and slightly witty tone.
6. **Sample user stories** — The JSON includes \`pulseUserStories\`: rule-based one-line verdicts per pulse user (\`userId\`, optional \`email\`, \`userLocalTime\`, \`profileTimezone\`, \`verdict\`). Use \`userLocalTime\` + timezone to interpret “ghosting” vs “wrong time of day.” Reference **specific \`userId\`** when tying recommendations to real behavior; do not invent users not in that list.

Note: This is often a small beta group (roughly 1–5 users). Provide highly specific, individual-focused observations rather than broad statistical trends.

When cohortShadowDistribution is dominated by one archetype, tailor the tactical UX fix to that group (e.g. Hustlers: speed; Strategists: depth; Visionaries: meaning; Builders: execution).

Output in **Markdown** only: start with an ## heading line (you may use one emoji in the heading). Use **bold** for key phrases. No code blocks.`

const EMPTY_SHADOW_DIST: Record<ShadowArchetypeName, number> = {
  visionary: 0,
  builder: 0,
  hustler: 0,
  strategist: 0,
  hybrid: 0,
}

/** Resolves pulse extras when older cached payloads omit new fields. */
function resolvePulseInsightFields(payload: FounderJourneyCommandCenterPayload) {
  const p = payload.pulse
  const pulseShadowDistribution = { ...EMPTY_SHADOW_DIST, ...(p.shadowDistribution ?? {}) }
  const activityByHourUtc =
    p.activityByHourUtc ??
    Array.from({ length: 24 }, (_, h) => ({ hour: h, total: 0, byShadow: {} }))
  return { pulseShadowDistribution, activityByHourUtc }
}

const MAX_PULSE_USER_STORIES = 200

export function buildStrategicAdvisorUserPrompt(payload: FounderJourneyCommandCenterPayload): string {
  const { pulseShadowDistribution, activityByHourUtc } = resolvePulseInsightFields(payload)
  const cohortShadowDistribution = { ...EMPTY_SHADOW_DIST, ...(payload.shadowDistribution ?? {}) }
  const pulsePts = payload.pulse.points
  const storySlice = pulsePts.length > MAX_PULSE_USER_STORIES ? pulsePts.slice(0, MAX_PULSE_USER_STORIES) : pulsePts
  const pulseUserStories = storySlice.map((p) => ({
    userId: p.userId,
    email: p.email,
    userLocalTime: p.userLocalTime,
    profileTimezone: p.profileTimezone,
    verdict: generateUserStory({
      userId: p.userId,
      shadow: p.shadow,
      lastDevice: p.lastDevice ?? 'Unknown',
      recentPath: p.recentPath ?? [],
      minutesToFirstMorningSave: p.minutesToFirstMorningSave ?? null,
      calendarHook: Boolean(p.calendarHook),
      engagementScore: p.engagementScore,
      daysSinceSignup: p.daysSinceSignup,
      profileTimezone: p.profileTimezone,
      profileCreatedAtIso: p.profileCreatedAt,
      firstMorningCommittedAtIso: p.firstMorningCommittedAt,
    }),
  }))
  const bundle = {
    momentumFunnel: payload.funnel,
    shadowArchetypeRetention: payload.retentionByShadow,
    emergencyTrust: payload.emergency,
    sensors: payload.sensors,
    dateRangeStart: payload.dateRangeStart,
    dateRangeEnd: payload.dateRangeEnd,
    shadowSummary: payload.shadowSummary ?? '',
    cohortShadowDistribution,
    pulseShadowDistribution,
    pulseActivityByHourUtc: activityByHourUtc,
    heuristicVerdicts: payload.deerAdvice,
    generatedAt: payload.generatedAt,
    pulseUserStories,
    pulseUserStoriesMeta:
      pulsePts.length > MAX_PULSE_USER_STORIES
        ? { truncated: true, included: MAX_PULSE_USER_STORIES, totalPulseUsers: pulsePts.length }
        : { truncated: false, totalPulseUsers: pulsePts.length },
  }
  return `Analyze this Command Center snapshot and write Mrs. Deer's strategic review.\n\n${JSON.stringify(bundle, null, 2)}`
}

export function formatFallbackDeerAdviceMarkdown(payload: FounderJourneyCommandCenterPayload): string {
  if (!payload.deerAdvice.length) {
    return `## Rule-based fallback\n\n*The AI advisor was unavailable — there are no heuristic verdicts for this cohort yet.*`
  }
  const blocks = payload.deerAdvice.map((a) => `### ${a.title}\n\n${a.body}`)
  return `## Rule-based fallback\n\n*The AI advisor was unavailable — showing heuristic funnel rules instead.*\n\n${blocks.join('\n\n')}`
}
