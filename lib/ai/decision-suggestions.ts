import { generateAIPrompt, AIError } from '@/lib/ai-client'

interface DecisionSuggestionInput {
  userId: string
  tasks: Array<{ description: string; action_plan?: string | null }>
  patterns: any
  userProfile: {
    primary_goal_text?: string | null
    struggles?: string[] | null
    founder_stage?: string | null
    industry?: string | null
  } | null
  recentDecisions: Array<{ plan_date: string; decision: string }>
  limit?: number
}

export async function generateAISuggestions({
  tasks,
  patterns,
  userProfile,
  recentDecisions,
  limit = 3,
}: DecisionSuggestionInput): Promise<string[]> {
  if (!tasks.length && !patterns && !recentDecisions.length) {
    return []
  }

  const tasksBlock =
    tasks.length > 0
      ? tasks
          .map((t) => `- ${t.description}${t.action_plan ? ` (plan: ${t.action_plan})` : ''}`)
          .join('\n')
      : 'No tasks planned.'

  const profileGoal = userProfile?.primary_goal_text || 'Not specified'
  const struggles = Array.isArray(userProfile?.struggles) ? userProfile?.struggles.join(', ') : 'Not specified'
  const founderStage = userProfile?.founder_stage || 'Not specified'
  const industry = userProfile?.industry || 'Not specified'

  const totalPostponements = patterns?.overallStats?.totalPostponements ?? 0
  const mostPostponedTask = patterns?.overallStats?.mostPostponedTask?.description ?? 'none'
  const needleMoverPostponeRate = patterns?.overallStats?.needleMoverPostponeRate ?? 0

  const recentDecisionsBlock =
    recentDecisions.length > 0
      ? recentDecisions
          .map((d) => `- [${d.plan_date}] ${d.decision}`)
          .join('\n')
      : 'No recent decisions logged.'

  const systemPrompt = [
    'You are Mrs. Deer, a thoughtful but concise coach for founders.',
    'Your job: suggest concrete decision prompts for the founder to reflect on today.',
    'Output format: ONLY a valid JSON array of strings, no prose, no explanation.',
    'Each string should be a short, specific decision they might be facing.',
    'Keep suggestions grounded in their tasks, patterns, and profile.',
  ].join(' ')

  const userPrompt = `
User profile:
- Goal: ${profileGoal}
- Struggles: ${struggles}
- Founder stage: ${founderStage}
- Industry: ${industry}

Today's tasks:
${tasksBlock}

Postponement patterns (last 14 days):
- Total postponed tasks: ${totalPostponements}
- Most postponed task: ${mostPostponedTask}
- % of postponed tasks that were needle movers: ${needleMoverPostponeRate}%

Recent decisions (last 7 days):
${recentDecisionsBlock}

Now suggest ${limit} specific decision prompts they might be facing today.
Return ONLY a JSON array of strings, for example:
["How to price the new offer", "Whether to delegate social media", "What to prioritize tomorrow"]
`

  try {
    const raw = await generateAIPrompt({
      systemPrompt,
      userPrompt,
      maxTokens: 180,
      temperature: 0.7,
    })

    const trimmed = raw.trim()
    const jsonStart = trimmed.indexOf('[')
    const jsonEnd = trimmed.lastIndexOf(']')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return []
    }

    const jsonText = trimmed.slice(jsonStart, jsonEnd + 1)
    const parsed = JSON.parse(jsonText) as unknown
    if (!Array.isArray(parsed)) return []

    const suggestions = parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((s) => s.length > 0)
      .slice(0, limit)

    return suggestions
  } catch (err) {
    if (err instanceof AIError) {
      console.error('[Decision Suggestions] AIError:', err.message, 'model:', err.model, 'details:', err.openRouterError)
    } else {
      console.error('[Decision Suggestions] Unexpected error:', err)
    }
    return []
  }
}

