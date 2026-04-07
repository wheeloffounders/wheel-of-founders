import { format, subDays } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type ActionPlanMatrixKey,
  isActionPlanMatrixKey,
  parseAISuggestedActionTypeToMatrixKey,
} from '@/lib/morning/pro-action-matrix'
import { proMorningAiPost } from '@/lib/morning/pro-morning-api'

export type DecisionStrategyOption = {
  label: string
  text: string
  reasoning: string
  /** Leadership-layer hint from Mrs. Deer (optional for older saved trays). */
  suggestedActionPlan?: ActionPlanMatrixKey
  /** One line: why this action type fits their pattern. */
  actionTypeWhy?: string
}

export type ProOracleContext = {
  quarterlyIntention: string | null
  primaryGoal: string | null
  eveningDaysLast14: number
  activeMorningDaysLast14: number
  postponementsLast14: number
  /** App streak (e.g. journey); 0 = treat as new / Day 1 in copy. */
  currentStreak: number
  /** Recent postponed task titles (last 14d, newest first) for friction signal. */
  postponementTaskHints: string[]
}

export async function fetchProOracleContext(
  supabase: SupabaseClient,
  userId: string,
  planDateYmd: string
): Promise<ProOracleContext> {
  const anchor = new Date(`${planDateYmd}T12:00:00`)
  const sinceYmd = format(subDays(anchor, 14), 'yyyy-MM-dd')
  const sinceIso = `${sinceYmd}T00:00:00.000Z`

  const [profileRes, evRes, mtRes, postCountRes, postSamplesRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('quarterly_intention, primary_goal_text, current_streak')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .gte('review_date', sinceYmd),
    supabase
      .from('morning_tasks')
      .select('plan_date')
      .eq('user_id', userId)
      .gte('plan_date', sinceYmd),
    supabase
      .from('task_postponements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('moved_at', sinceIso),
    supabase
      .from('task_postponements')
      .select('task_description')
      .eq('user_id', userId)
      .gte('moved_at', sinceIso)
      .order('moved_at', { ascending: false })
      .limit(6),
  ])

  const profile = profileRes.data as {
    quarterly_intention?: string | null
    primary_goal_text?: string | null
    current_streak?: number | null
  } | null

  const evRows = (evRes.data ?? []) as { review_date?: string }[]
  const eveningDaysLast14 = new Set(evRows.map((r) => r.review_date).filter(Boolean)).size

  const mtRows = (mtRes.data ?? []) as { plan_date?: string }[]
  const activeMorningDaysLast14 = new Set(mtRows.map((r) => r.plan_date).filter(Boolean)).size

  const postponementsLast14 = postCountRes.count ?? 0
  const sampleRows = (postSamplesRes.data ?? []) as { task_description?: string | null }[]
  const postponementTaskHints = sampleRows
    .map((r) => (typeof r.task_description === 'string' ? r.task_description.trim() : ''))
    .filter(Boolean)
    .map((t) => (t.length > 100 ? `${t.slice(0, 97)}…` : t))
    .slice(0, 5)

  return {
    quarterlyIntention: profile?.quarterly_intention?.trim() || null,
    primaryGoal: profile?.primary_goal_text?.trim() || null,
    eveningDaysLast14,
    activeMorningDaysLast14,
    postponementsLast14,
    currentStreak: Math.max(0, Number(profile?.current_streak ?? 0)),
    postponementTaskHints,
  }
}

/** Single ghost line (legacy / simple surfaces). */
export function composeMrsDeerDecisionGhost(ctx: ProOracleContext): string {
  const bits: string[] = []

  if (ctx.quarterlyIntention) {
    const q =
      ctx.quarterlyIntention.length > 160
        ? `${ctx.quarterlyIntention.slice(0, 157)}…`
        : ctx.quarterlyIntention
    bits.push(`Stay aligned with your quarter: ${q}`)
  } else if (ctx.primaryGoal) {
    const g =
      ctx.primaryGoal.length > 120 ? `${ctx.primaryGoal.slice(0, 117)}…` : ctx.primaryGoal
    bits.push(`Anchor today on your north star: ${g}`)
  }

  if (ctx.postponementsLast14 >= 3) {
    bits.push(`You’ve been shifting work forward—pick one thing to land today so momentum sticks.`)
  } else if (ctx.eveningDaysLast14 >= 5 && ctx.activeMorningDaysLast14 >= 5) {
    bits.push(`Your rhythm is strong—name the one decision that makes tonight’s reflection feel honest.`)
  } else if (ctx.eveningDaysLast14 < 3) {
    bits.push(`Light evening rhythm lately—choose a decision small enough to finish and worth reflecting on.`)
  }

  if (bits.length === 0) {
    return `Name one decision today you’ll be glad you owned—something that moves the business, not just the inbox.`
  }

  bits.push(`What’s the single pivot you want true by tonight?`)
  return bits.join(' ')
}

/** Three local fallback cards when the Pro morning API is unavailable. */
export function composeMrsDeerDecisionStrategies(ctx: ProOracleContext): DecisionStrategyOption[] {
  const goal =
    ctx.primaryGoal ||
    ctx.quarterlyIntention ||
    'what you’re building this quarter'
  const goalShort = goal.length > 90 ? `${goal.slice(0, 87)}…` : goal

  if (ctx.currentStreak === 0 && ctx.postponementsLast14 < 2) {
    return [
      {
        label: 'Foundational clarity',
        text: `Decide the one outcome that would make today a win for ${goalShort}—stated so clearly you could explain it in one breath.`,
        reasoning:
          'Thin history — we’re not inventing friction; we’re helping you set a clean intention for Day 1.',
        suggestedActionPlan: 'my_zone',
        actionTypeWhy: 'Day one is about your judgment call on what matters most.',
      },
      {
        label: 'Primary alignment',
        text: `Choose a single decision that moves ${goalShort} forward more than anything else on your list today.`,
        reasoning: 'When patterns are still forming, tie the pivot directly to the goal you declared.',
        suggestedActionPlan: 'my_zone',
        actionTypeWhy: 'Anchor the day on work only you can steer toward the goal.',
      },
      {
        label: 'Energy honest',
        text: 'Name the decision that protects your focus today—what you will say no to so your best hours go to what matters.',
        reasoning: 'New rhythm benefits from guarding bandwidth before optimizing tactics.',
        suggestedActionPlan: 'quick_win_founder',
        actionTypeWhy: 'Light data — a small honest win builds the habit without overload.',
      },
    ]
  }

  if (ctx.postponementsLast14 >= 3 && ctx.postponementTaskHints[0]) {
    const hint = ctx.postponementTaskHints[0]
    return [
      {
        label: 'The logjam',
        text: `Decide to finish or decisively drop one postponed thread (e.g. “${hint}”) so it stops stealing tomorrow.`,
        reasoning: `Postponements are elevated—this option centers on clearing real backlog you’ve been carrying.`,
        suggestedActionPlan: 'delegate_founder',
        actionTypeWhy: 'Repeated delays often mean the work should leave your desk or be reframed.',
      },
      {
        label: 'The shrink',
        text: 'Choose the smallest shippable version of your scariest task and commit to getting it out the door today.',
        reasoning: 'Reducing scope breaks the delay cycle without pretending the work vanished.',
        suggestedActionPlan: 'quick_win_founder',
        actionTypeWhy: 'A tiny shipped slice breaks the postponement loop.',
      },
      {
        label: 'The uncomfortable',
        text: 'Name the one conversation, send, or decision you’ve been avoiding—and put it on the calendar for today.',
        reasoning: 'Friction often hides in the task that feels emotionally expensive, not technically hard.',
        suggestedActionPlan: 'my_zone',
        actionTypeWhy: 'The avoided move is usually the one only you can initiate.',
      },
    ]
  }

  if (ctx.eveningDaysLast14 >= 5 && ctx.activeMorningDaysLast14 >= 5) {
    return [
      {
        label: 'Scale the win',
        text: `Decide how you’ll compound this week’s momentum on ${goalShort}—one lever you’ll pull harder today.`,
        reasoning: 'Steady mornings + evenings — you can lean into amplification, not rescue.',
        suggestedActionPlan: 'my_zone',
        actionTypeWhy: 'Strong rhythm — double down on leverage only you can drive.',
      },
      {
        label: 'The tighten',
        text: 'Pick one process or habit in your rhythm to optimize (handoff, template, or batch) so next week costs less energy.',
        reasoning: 'Optimization fits when the habit loop is already working.',
        suggestedActionPlan: 'systemize',
        actionTypeWhy: 'You’ve shown up consistently — systemize what’s working.',
      },
      {
        label: 'Future-proof',
        text: 'Choose a decision today that reduces risk or debt you’d regret in 30 days—documentation, key hire, or key customer.',
        reasoning: 'With consistency proven, it’s honest to lift your eyes slightly up the road.',
        suggestedActionPlan: 'my_zone',
        actionTypeWhy: 'Long-horizon bets still need your executive judgment.',
      },
    ]
  }

  return [
    {
      label: 'The pivot',
      text: `What’s the single decision that unlocks ${goalShort} the most if you get it right before tonight?`,
      reasoning: 'Balanced signal — three angles without forcing a fake crisis.',
      suggestedActionPlan: 'my_zone',
      actionTypeWhy: 'Mixed signal — name the call that only you can make.',
    },
    {
      label: 'The cut',
      text: 'What will you explicitly not chase today so your best attention lands on what actually moves the needle?',
      reasoning: 'Trade-offs matter when data is mixed; clarity beats adding more.',
      suggestedActionPlan: 'eliminate_founder',
      actionTypeWhy: 'Letting go of noise is as strategic as shipping.',
    },
    {
      label: 'The proof',
      text: 'What evidence will you create today—metric, customer touch, or shipped artifact—that proves today’s decision was real?',
      reasoning: 'Grounds the day in something observable for tonight’s reflection.',
      suggestedActionPlan: 'quick_win_founder',
      actionTypeWhy: 'A visible proof point closes the loop fast.',
    },
  ]
}

/** Strategy tray via `/api/ai/pro-morning` (SUGGEST_DECISION). Falls back to `composeMrsDeerDecisionStrategies` on failure. */
export async function fetchProMorningDecisionStrategies(planDate: string): Promise<DecisionStrategyOption[]> {
  const data = await proMorningAiPost<{ strategies?: DecisionStrategyOption[] }>({
    action: 'SUGGEST_DECISION',
    planDate,
  })
  const arr = data.strategies
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('Empty strategies')
  const cleaned = arr
    .map((x) => {
      const label = typeof x?.label === 'string' ? x.label.trim() : ''
      const text = typeof x?.text === 'string' ? x.text.trim() : ''
      const reasoning = typeof x?.reasoning === 'string' ? x.reasoning.trim() : ''
      const rawType =
        (x as { action_type?: unknown; actionType?: unknown }).action_type ??
        (x as { actionType?: unknown }).actionType ??
        (x as { recommended_action?: unknown }).recommended_action ??
        (x as { recommendedAction?: unknown }).recommendedAction
      const rawWhy =
        (x as { action_type_why?: unknown; actionTypeWhy?: unknown }).action_type_why ??
        (x as { actionTypeWhy?: unknown }).actionTypeWhy
      let suggestedActionPlan: ActionPlanMatrixKey | undefined
      if (typeof rawType === 'string' && rawType.trim()) {
        const t = rawType.trim()
        suggestedActionPlan = isActionPlanMatrixKey(t) ? t : parseAISuggestedActionTypeToMatrixKey(t)
      }
      const actionTypeWhy =
        typeof rawWhy === 'string' && rawWhy.trim() ? rawWhy.trim() : undefined
      const out: DecisionStrategyOption = { label, text, reasoning }
      if (suggestedActionPlan) out.suggestedActionPlan = suggestedActionPlan
      if (actionTypeWhy) out.actionTypeWhy = actionTypeWhy
      return out
    })
    .filter((x) => x.label && x.text)
    .slice(0, 3)
  if (cleaned.length < 3) throw new Error('Incomplete strategies')
  return cleaned
}
