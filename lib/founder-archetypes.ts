import { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import {
  DECISION_STYLE_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_EVENINGS,
} from '@/lib/founder-dna/unlock-schedule-config'

export type ArchetypeName = 'visionary' | 'builder' | 'hustler' | 'strategist' | 'hybrid'

export type ArchetypeDefinition = {
  name: ArchetypeName
  label: string
  icon: string
  description: string
}

export type ArchetypeResult = {
  primary: ArchetypeDefinition & { confidence: number }
  secondary?: ArchetypeDefinition & { confidence: number }
  traits: {
    strategic: number // 0-100
    tactical: number // 0-100
    builder: number // 0-100 (relative score)
    visionary: number // 0-100 (relative score)
  }
  personalityProfile: {
    tagline: string
    title: string
    description: string
    recentExampleBox: {
      date: string
      headline: string
      example: string
      interpretation: string
    }
    keyCharacteristics: string[]
    strengths: string[]
    growthEdges: string[]
    relationshipsAndWork: string
    cognitivePattern: {
      dominant: string
      auxiliary: string
      underdeveloped: string
      stressResponse: string
    }
    unlockedInsights: string[]
  }
  breakdown: {
    signals: Array<{
      name: string
      contribution: number
      description: string
      archetypeBoost: string
      details?: string
    }>
    totalConfidence: number
    explanation: string
  }
}

export type ArchetypeInput = {
  strategicCount: number
  tacticalCount: number
  actionPlanCounts: Record<string, number>
  eveningWinsLessonsText: string
  founderPersonality?: string | null
  postponementActionPlanCounts?: Record<string, number>
  postponementsTotalCount?: number
  energyReviewsTotalCount?: number
  duoActive?: boolean
  daysActive?: number
  unlockedFeatureNames?: string[]
  // Personality-profile evidence (used to add concrete dates/tasks)
  recentStrategicDecisionExample?: {
    date: string
    decision: string
  }
  recentTacticalDecisionExample?: {
    date: string
    decision: string
  }
  focusTimeCompleted30dCount?: number
  focusTimeExampleTask?: {
    date: string
    description: string
  }
  topPostponedSystemizeTaskExample?: {
    movedCount: number
    lastMovedDate: string
    taskDescription: string
    actionPlan?: string
  }
  duoInviteExample?: {
    date: string
    invitedEmail: string
  }
  stressEveningThenNextDecisionsExample?: {
    reviewDate: string
    keyword: string
    nextDecisionsStrategic: number
    nextDecisionsTactical: number
    nextDecisionsTotal: number
  }
}

const ARCHETYPES: Record<Exclude<ArchetypeName, 'hybrid'>, ArchetypeDefinition> = {
  visionary: {
    name: 'visionary',
    label: 'Visionary',
    icon: '🔭',
    description: 'You see the big picture and dream big.',
  },
  builder: {
    name: 'builder',
    label: 'Builder',
    icon: '🏗️',
    description: 'You love creating and iterating.',
  },
  hustler: {
    name: 'hustler',
    label: 'Hustler',
    icon: '🚀',
    description: 'You get things done and push forward.',
  },
  strategist: {
    name: 'strategist',
    label: 'Strategist',
    icon: '📐',
    description: 'You plan carefully and optimize.',
  },
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function countKeywordHits(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  let hits = 0
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const matches = lower.match(re)
    hits += matches?.length ?? 0
  }
  return hits
}

function normalizeRatio(count: number, total: number) {
  if (total <= 0) return 0
  return count / total
}

export function computeFounderArchetype(input: ArchetypeInput): ArchetypeResult {
  const {
    strategicCount,
    tacticalCount,
    actionPlanCounts,
    eveningWinsLessonsText,
    founderPersonality,
    postponementActionPlanCounts,
    postponementsTotalCount,
    energyReviewsTotalCount,
    duoActive,
    daysActive,
    unlockedFeatureNames,
    recentStrategicDecisionExample,
    recentTacticalDecisionExample,
    focusTimeCompleted30dCount,
    focusTimeExampleTask,
    topPostponedSystemizeTaskExample,
    duoInviteExample,
    stressEveningThenNextDecisionsExample,
  } = input

  const totalDecisions = strategicCount + tacticalCount
  const strategicRatio = normalizeRatio(strategicCount, totalDecisions) // 0..1
  const tacticalRatio = normalizeRatio(tacticalCount, totalDecisions) // 0..1

  // Action plan tendencies (based on how users structure their mornings)
  const apTotal = Object.values(actionPlanCounts).reduce((a, b) => a + b, 0)
  const apPct = (plan: string) => (apTotal > 0 ? (actionPlanCounts[plan] ?? 0) / apTotal : 0)

  const quickWinPct = apPct('quick_win_founder')
  const systemizePct = apPct('systemize')
  const delegatePct = apPct('delegate_founder')
  const eliminatePct = apPct('eliminate_founder')
  const myZonePct = apPct('my_zone')

  const combinedText = `${eveningWinsLessonsText ?? ''} ${founderPersonality ?? ''}`

  // Keyword scanning (kept intentionally simple + deterministic)
  const visionaryHits = countKeywordHits(combinedText, ['vision', 'future', 'big', 'picture', 'purpose', 'dream'])
  const builderHits = countKeywordHits(combinedText, ['build', 'create', 'iterate', 'improve', 'prototype', 'craft'])
  const hustlerHits = countKeywordHits(combinedText, ['done', 'execute', 'quick', 'fast', 'action', 'momentum', 'ship'])
  const strategistHits = countKeywordHits(combinedText, [
    'plan',
    'optimize',
    'strategy',
    'system',
    'framework',
    'model',
    'measure',
    'leverage',
  ])

  const strategicPct100 = Math.round(strategicRatio * 100)
  const tacticalPct100 = 100 - strategicPct100

  // Base scoring (0..100-ish) from decision style + morning action plans + evening text.
  const visionaryScore = clamp(
    strategicPct100 * 0.55 +
      eliminatePct * 100 * 0.15 +
      delegatePct * 100 * 0.08 +
      visionaryHits * 6 +
      (myZonePct * 100) * 0.02,
    0,
    100
  )

  const builderScore = clamp(
    tacticalPct100 * 0.45 +
      myZonePct * 100 * 0.22 +
      delegatePct * 100 * 0.14 +
      builderHits * 6 +
      systemizePct * 100 * 0.05,
    0,
    100
  )

  const hustlerScore = clamp(
    quickWinPct * 100 * 0.55 +
      (tacticalPct100 * 0.15 + strategicPct100 * 0.1) * 0.1 +
      hustlerHits * 6 +
      myZonePct * 100 * 0.08,
    0,
    100
  )

  const strategistScore = clamp(
    (100 - Math.abs(strategicPct100 - 50) * 2) * 0.5 +
      systemizePct * 100 * 0.25 +
      strategicPct100 * 0.1 +
      strategistHits * 6 +
      eliminatePct * 100 * 0.05,
    0,
    100
  )

  const scores: Record<Exclude<ArchetypeName, 'hybrid'>, number> = {
    visionary: visionaryScore,
    builder: builderScore,
    hustler: hustlerScore,
    strategist: strategistScore,
  }

  const sorted = (Object.entries(scores) as Array<[keyof typeof scores, number]>).sort((a, b) => b[1] - a[1])
  const top1 = sorted[0]
  const top2 = sorted[1]

  const top1Score = top1?.[1] ?? 0
  const top2Score = top2?.[1] ?? 0

  const primaryKey =
    top1Score <= 0
      ? 'strategist'
      : Math.abs(top1Score - top2Score) <= 12 && top2Score >= 25
        ? 'hybrid'
        : (top1?.[0] ?? 'strategist')

  const hybridDef: ArchetypeDefinition = {
    name: 'hybrid',
    label: 'Hybrid',
    icon: '⚡',
    description: 'You blend multiple strengths.',
  }

  const pickDef = (key: ArchetypeName): ArchetypeDefinition => {
    if (key === 'hybrid') return hybridDef
    return ARCHETYPES[key]
  }

  const denom = top1Score + Math.max(top2Score, 1)
  const topConfidence = denom > 0 ? Math.round((top1Score / denom) * 100) : 0
  const secondConfidence = denom > 0 ? Math.round((top2Score / denom) * 100) : 0

  const primaryDef = pickDef(primaryKey)
  const secondaryKey: Exclude<ArchetypeName, 'hybrid'> | undefined =
    primaryKey === 'hybrid' ? (top2?.[0] as Exclude<ArchetypeName, 'hybrid'> | undefined) : undefined

  const secondaryDef = secondaryKey ? ARCHETYPES[secondaryKey] : undefined

  // ----------------------------
  // Breakdown signals (transparent "why")
  // ----------------------------
  const decisionsBoost =
    strategicPct100 > 60 ? 'Visionary' : tacticalPct100 > 60 ? 'Hustler' : 'Strategist'

  const decisionsContribution = clamp(Math.round(Math.abs(strategicPct100 - 50) * 2), 0, 100)
  const decisionsLeanLabel =
    strategicPct100 >= 60 ? 'strategic' : tacticalPct100 >= 60 ? 'tactical' : 'balanced'

  const decisionsDescription =
    decisionsLeanLabel === 'strategic'
      ? 'Decisions show a strategic, long-term tilt.'
      : decisionsLeanLabel === 'tactical'
        ? 'Decisions show action-first momentum.'
        : 'Decisions balance strategy and execution.'

  const decisionsDetails =
    decisionsLeanLabel === 'strategic'
      ? 'Growth edge: pick one leverage point, then define the smallest tactical step you can ship today.'
      : decisionsLeanLabel === 'tactical'
        ? 'Growth edge: keep moving fast-but name the "why" behind the action so quick wins ladder up to strategy.'
        : 'Growth edge: after every plan, choose one tactical move that turns intent into progress.'

  const planToBoost: Record<string, { boost: string; key: string }> = {
    my_zone: { boost: 'Builder', key: 'builder' },
    systemize: { boost: 'Strategist', key: 'strategist' },
    delegate_founder: { boost: 'Strategist', key: 'strategist' },
    quick_win_founder: { boost: 'Hustler', key: 'hustler' },
    eliminate_founder: { boost: 'Visionary', key: 'visionary' },
  }

  const planKeyToLabel = (key: string | null): string => {
    switch (key) {
      case 'my_zone':
        return 'Focus Time'
      case 'systemize':
        return 'Systemize'
      case 'delegate_founder':
        return 'Delegate'
      case 'eliminate_founder':
        return 'Eliminate'
      case 'quick_win_founder':
        return 'Quick Win'
      default:
        return 'other work'
    }
  }

  const topPlanEntry = Object.entries(actionPlanCounts).sort((a, b) => b[1] - a[1])[0]
  const topPlanKey = topPlanEntry?.[0] ?? null
  const topPlanCount = topPlanEntry?.[1] ?? 0
  const topPlanTotal = apTotal
  const topPlanPct = topPlanTotal > 0 ? topPlanCount / topPlanTotal : 0

  const planBoost = topPlanKey ? planToBoost[topPlanKey]?.boost ?? 'Strategist' : 'Strategist'
  const taskPlansContribution = clamp(Math.round(topPlanPct * 100), 0, 100)
  const taskPlanLabel = planKeyToLabel(topPlanKey)

  const taskPlansDescription = topPlanKey
    ? `Your mornings gravitate toward ${taskPlanLabel}.`
    : 'Your action-plan tendency is still forming.'

  const taskPlansDetails = topPlanKey
    ? (() => {
        switch (topPlanKey) {
          case 'my_zone':
            return 'Keep protecting your focus: start with a deep-work block before checking anything else.'
          case 'systemize':
            return 'Turn your best patterns into repeatable systems: draft a tiny template and test it tomorrow.'
          case 'delegate_founder':
            return 'Leverage your time: write a clear handoff note and delegate one micro-task today.'
          case 'eliminate_founder':
            return 'Trim the noise: run a quick cut list and remove one low-value task.'
          case 'quick_win_founder':
            return 'Use momentum on purpose: batch small wins early so you build traction fast.'
          default:
            return 'Your planning style is visible - keep it, then sharpen it with one small improvement.'
        }
      })()
    : 'Complete a few more mornings to make the pattern clearer.'

  const visionaryKeywordsHits = visionaryHits
  const builderKeywordsHits = builderHits
  const eveningTotalHits = visionaryKeywordsHits + builderKeywordsHits + 1 // +1 prevents divide-by-zero
  const eveningDominantBoost = visionaryKeywordsHits >= builderKeywordsHits ? 'Visionary' : 'Builder'
  const eveningContribution = clamp(
    Math.round((Math.max(visionaryKeywordsHits, builderKeywordsHits) / eveningTotalHits) * 100),
    0,
    100
  )
  const eveningDescription =
    eveningDominantBoost === 'Visionary'
      ? "Evening reflections reach toward what's possible."
      : 'Evening reflections focus on building and improving.'

  const eveningDetails =
    eveningDominantBoost === 'Visionary'
      ? 'Next step: pull one "next possibility" from your reflection and choose one test to try tomorrow.'
      : "Next step: extract one improvement you can apply immediately, then convert it into tomorrow's first action."

  const personalityProvided = !!founderPersonality && founderPersonality.trim().length > 0
  let personalityBoost = 'Strategist'
  if (personalityProvided) {
    const p = founderPersonality!.toLowerCase()
    if (['vision', 'future', 'dream', 'big', 'purpose'].some((k) => p.includes(k))) personalityBoost = 'Visionary'
    else if (['build', 'create', 'iterate', 'craft', 'make', 'improve'].some((k) => p.includes(k))) personalityBoost = 'Builder'
    else if (['hustle', 'push', 'do', 'execute', 'action', 'momentum', 'quick', 'fast'].some((k) => p.includes(k))) personalityBoost = 'Hustler'
    else if (['plan', 'optimize', 'system', 'framework', 'strategy', 'measure'].some((k) => p.includes(k))) personalityBoost = 'Strategist'
  }

  const personalityContribution = personalityProvided ? 20 : 0
  const personalityDescription = personalityProvided
    ? `Your self-report matches this pattern.`
    : 'Set your founder personality for a sharper read.'

  const signals = [
    {
      name: 'Decisions',
      contribution: decisionsContribution,
      description: decisionsDescription,
      archetypeBoost: decisionsBoost,
      details: decisionsDetails,
    },
    {
      name: 'Task Plans',
      contribution: taskPlansContribution,
      description: taskPlansDescription,
      archetypeBoost: planBoost,
      details: taskPlansDetails,
    },
    {
      name: 'Evening Keywords',
      contribution: eveningContribution,
      description: eveningDescription,
      archetypeBoost: eveningDominantBoost,
      details: eveningDetails,
    },
    ...(personalityProvided
      ? [
          {
            name: 'Personality',
            contribution: personalityContribution,
            description: personalityDescription,
            archetypeBoost: personalityBoost,
            details: `Your words connect the dots between how you decide and how you act.`,
          },
        ]
      : []),
  ]

  const strongestSignal = [...signals].sort((a, b) => b.contribution - a.contribution)[0]
  const growthEdge =
    strongestSignal?.name === 'Decisions'
      ? 'Growth edge: turn your decisions into one clear leverage point, then attach a single tactical step.'
      : strongestSignal?.name === 'Task Plans'
        ? 'Growth edge: keep your planning bias, but upgrade it with one small improvement you test immediately.'
        : strongestSignal?.name === 'Evening Keywords'
            ? 'Growth edge: after each reflection, choose one "next possibility" and schedule the smallest test for tomorrow.'
          : strongestSignal?.name === 'Personality'
            ? 'Growth edge: treat your self-report as a compass-if your behavior drifts, adjust your next plan, not your identity.'
            : 'Growth edge: pick the next best move and run a small experiment.'

  const next30Days =
    'Next 30 days: run one small founder experiment each week (from morning intent to evening learning), and write your reflections as "what changed because of my choice?"'

  const explanation = strongestSignal
    ? `Mrs. Deer sees you as a ${primaryDef.label} because your strongest signal comes from ${strongestSignal.name.toLowerCase()}. The pattern is emerging now, use it to pick the next best move (not just the next best idea). ${growthEdge} ${next30Days}`
    : `Your archetype is forming based on your data - keep reflecting and the pattern will sharpen. ${growthEdge} ${next30Days}`

  // ----------------------------
  // Personality Profile (MBTI-like)
  // ----------------------------
  const postponedCounts = postponementActionPlanCounts ?? {}
  const postponedTotal =
    postponementsTotalCount ??
    Object.values(postponedCounts).reduce((a, b) => a + b, 0)

  const postponedEntries = Object.entries(postponedCounts).sort((a, b) => b[1] - a[1])
  const topPostponedPlanKey = postponedEntries[0]?.[0] ?? null
  const topPostponedPlanLabel = topPostponedPlanKey ? planKeyToLabel(topPostponedPlanKey) : null
  const topPostponedPlanShare =
    topPostponedPlanKey && postponedTotal > 0 ? (postponedEntries[0]?.[1] ?? 0) / postponedTotal : 0

  const emotionalHits = countKeywordHits(combinedText.toLowerCase(), [
    'feel',
    'emotion',
    'heart',
    'worried',
    'anxious',
    'stressed',
    'overwhelmed',
    'fear',
    'sad',
    'anger',
    'lonely',
  ])

  const stressHits = countKeywordHits(combinedText.toLowerCase(), [
    'anxious',
    'worried',
    'overwhelm',
    'panic',
    'micromanage',
    'control',
    'tight',
    'stuck',
    'worry',
  ])

  const dominantKeyForMbti = sorted[0]?.[0] ?? primaryKey
  const auxiliaryKeyForMbti = sorted[1]?.[0] ?? secondaryKey ?? primaryKey

  const keyToFunctionName = (key: ArchetypeName): string => {
    switch (key) {
      case 'visionary':
        return 'Strategic Vision'
      case 'builder':
        return 'Execution by Building'
      case 'hustler':
        return 'Execution Drive'
      case 'strategist':
        return 'Systems Optimization'
      case 'hybrid':
        return 'Hybrid Instinct'
      default:
        return 'Founder Instinct'
    }
  }

  const dominant = keyToFunctionName(dominantKeyForMbti as ArchetypeName)
  const auxiliary = keyToFunctionName(auxiliaryKeyForMbti as ArchetypeName)

  const stressKeywordsForNarrative = [
    'anxious',
    'worried',
    'overwhelm',
    'overwhelmed',
    'panic',
    'micromanage',
    'control',
    'tight',
    'stuck',
    'worry',
    'fear',
    'sad',
    'anger',
    'lonely',
  ]

  const topStressKeyword = stressKeywordsForNarrative
    .map((k) => ({ k, n: countKeywordHits(combinedText.toLowerCase(), [k]) }))
    .sort((a, b) => b.n - a.n)[0]?.n
    ? stressKeywordsForNarrative
        .map((k) => ({ k, n: countKeywordHits(combinedText.toLowerCase(), [k]) }))
        .sort((a, b) => b.n - a.n)[0]?.k
    : null

  const lowerCombinedText = combinedText.toLowerCase()
  const hardConversationsPresent =
    lowerCombinedText.includes('hard conversations') ||
    lowerCombinedText.includes('hard conversation') ||
    lowerCombinedText.includes('difficult conversations') ||
    lowerCombinedText.includes('difficult conversation')

  const underdeveloped =
    emotionalHits <= 1
      ? 'Emotional processing - you may default to outcomes and logic before naming what you (or others) feel.'
      : topStressKeyword
        ? `Emotional processing - when your reflections include "${topStressKeyword}", you tend to turn feelings into a planning problem. The next step is to name how you feel before you state the decision.`
        : hardConversationsPresent
          ? 'Emotional processing - your lessons often reference hard conversations. You process it logically, but under stress you may skip naming how it feels. Try: name the feeling in one sentence, then state the decision.'
        : 'Emotional processing - you notice emotions, but under stress they may delay action rather than steer it.'

  const stressResponse =
    stressHits >= 3
      ? topStressKeyword
        ? `Stress response: when "${topStressKeyword}" shows up, you tighten control and create structure to feel safe.`
        : 'Stress response: you tighten control and create structure to feel safe.'
      : 'Stress response: you push forward (or plan harder) to regain momentum.'

  const strategicLeanLabel = strategicPct100 >= 60 ? 'strategic' : tacticalPct100 >= 60 ? 'tactical' : 'balanced'

  const titleArchetypeKeys =
    primaryKey === 'hybrid' ? ([sorted[0]?.[0], sorted[1]?.[0]].filter(Boolean) as Array<Exclude<ArchetypeName, 'hybrid'>>).slice(0, 2) : [primaryKey as ArchetypeName]

  const titleArchetypes = titleArchetypeKeys
    .map((k) => (k === 'visionary' ? 'Visionary' : k === 'builder' ? 'Builder' : k === 'hustler' ? 'Hustler' : 'Strategist'))
    .slice(0, 2)

  const title = titleArchetypes.length === 2 ? `${titleArchetypes[0].toUpperCase()} + ${titleArchetypes[1].toUpperCase()}` : `${(titleArchetypes[0] ?? primaryDef.label).toUpperCase()}`

  const description =
    titleArchetypes.includes('Visionary') && titleArchetypes.includes('Hustler')
      ? 'You see what is next and move fast to capture it. Your best work turns big direction into immediate momentum.'
      : titleArchetypes.includes('Visionary') && titleArchetypes.includes('Strategist')
        ? 'You think ahead and optimize your path. You naturally convert future-thinking into systems other people can follow.'
        : titleArchetypes.includes('Builder') && titleArchetypes.includes('Hustler')
          ? 'You create and you launch. Your instinct is to prototype early, learn quickly, and iterate before the perfect plan.'
          : titleArchetypes.includes('Strategist') && titleArchetypes.includes('Builder')
            ? 'You plan carefully, then build the machine. Frameworks help you ship with confidence.'
            : 'Your founder patterns sharpen into a consistent playbook as you keep reflecting.'

  const safeExcerpt = (s: string | undefined | null, maxLen = 90) => {
    const v = (s ?? '').trim().replace(/\s+/g, ' ')
    if (!v) return ''
    if (v.length <= maxLen) return v
    return `${v.slice(0, maxLen - 3)}...`
  }

  const tagline = (() => {
    switch (dominantKeyForMbti as ArchetypeName) {
      case 'visionary':
        return "🔭 VISIONARY - You see what's next and turn big direction into momentum."
      case 'builder':
        return '🏗️ BUILDER — You build patterns into workable systems and ship improvements.'
      case 'hustler':
        return '🚀 HUSTLER — You move fast, learn by doing, and keep traction alive.'
      case 'strategist':
        return `📐 STRATEGIST - You plan carefully, then act decisively. ${strategicPct100}% of your choices are strategic, and your mornings lean into Focus Time (${Math.round(myZonePct * 100)}% of completed plans).`
      case 'hybrid':
        return '⚡ HYBRID — You blend strengths and adapt quickly to what the day needs.'
      default:
        return `${primaryDef.icon} ${primaryDef.label.toUpperCase()} — Your pattern is becoming clear.`
    }
  })()

  const recentExampleBox = (() => {
    if (recentStrategicDecisionExample?.decision) {
      return {
        date: recentStrategicDecisionExample.date ?? '—',
        headline: 'You chose',
        example: `"${safeExcerpt(recentStrategicDecisionExample.decision)}"`,
        interpretation:
          'Thats classic pattern behavior: you prioritize long-term leverage, then translate it into action.',
      }
    }
    if (focusTimeExampleTask?.description) {
      return {
        date: focusTimeExampleTask.date ?? '—',
        headline: 'You protected',
        example: `Focus Time task: "${safeExcerpt(focusTimeExampleTask.description)}"`,
        interpretation:
          'This is how your energy pattern works in practice: you keep deep work protected so good ideas can become real progress.',
      }
    }
    if (topPostponedSystemizeTaskExample?.taskDescription) {
      return {
        date: topPostponedSystemizeTaskExample.lastMovedDate ?? '—',
        headline: 'You postponed',
        example: `Systemize task: "${safeExcerpt(topPostponedSystemizeTaskExample.taskDescription)}"`,
        interpretation:
          'Your pattern says process-heavy work is the friction point. The fix is to shrink the first step, not to avoid the work.',
      }
    }

    return {
      date: '—',
      headline: 'From your history',
      example: 'Your pattern is emerging from recent mornings and evenings.',
      interpretation: 'Keep reflecting and the story will sharpen.',
    }
  })()

  const delegateDominant = delegatePct >= 0.18 && delegatePct >= Math.max(myZonePct, systemizePct, eliminatePct, quickWinPct)

  const keyCharacteristics = [
    strategicLeanLabel === 'strategic'
      ? `Strategic & Tactical: you see the long game AND you know how to play today. ${strategicPct100}% of your decisions are strategic, and ${tacticalPct100}% are tactical.`
      : strategicLeanLabel === 'tactical'
        ? `Strategic & Tactical: you move fast while staying grounded. ${tacticalPct100}% of your decisions are tactical, and ${strategicPct100}% are strategic.`
        : `Strategic & Tactical: your decisions balance planning and execution (${strategicPct100}% strategic / ${tacticalPct100}% tactical).`,
    delegateDominant
      ? 'Natural leader: delegation shows up more than your other plan choices, which suggests you trust others with clear ownership.'
      : 'Natural leader: your planning style is structured, which helps you lead without needing endless consensus.',
    myZonePct >= 0.25
      ? `Energy pattern: you're sharpest in mornings. ${Math.round(myZonePct * 100)}% of your completed plans lean into Focus Time.`
      : 'Energy pattern: your mornings build momentum through repeatable choices.',
    topPostponedPlanLabel
      ? `Risk profile: when friction hits, your postponements tend to cluster around ${topPostponedPlanLabel}-type work.`
      : 'Risk profile: your postponements reveal where work needs clearer structure or smaller next steps.',
    'Decision clarity: your decision mix stays consistent, which means you are learning your own founder playbook.',
  ]

  const strengthFromTopPlan = (() => {
    switch (topPlanKey) {
      case 'my_zone':
        return 'Focus protection: you protect deep work so ideas become real traction.'
      case 'systemize':
        return 'Repeatable systems: you turn patterns into process you can reuse.'
      case 'delegate_founder':
        return 'Leadership through delegation: you help others carry the load with clarity.'
      case 'eliminate_founder':
        return 'Pruning instinct: you know what to cut so effort goes where it matters.'
      case 'quick_win_founder':
        return 'Momentum building: you use small wins to keep progress moving.'
      default:
        return 'Your planning style is consistent, which makes execution easier over time.'
    }
  })()

  const strengths = [
    strategicLeanLabel === 'strategic'
      ? 'Strategic instincts: you naturally seek long-term leverage.'
      : 'Execution instincts: you translate intent into forward motion.',
    strengthFromTopPlan,
    eveningDominantBoost === 'Visionary'
      ? 'Future-facing reflections: your evenings reach toward what is possible.'
      : 'Improvement-driven reflections: your evenings focus on what to build and refine.',
    personalityProvided ? 'Self-awareness: your self-report matches your patterns.' : 'Pattern literacy: your reflections show a consistent playbook.',
  ]

  const bottomPlanKey = ['my_zone', 'systemize', 'delegate_founder', 'eliminate_founder', 'quick_win_founder'].sort(
    (a, b) => (actionPlanCounts[a] ?? 0) - (actionPlanCounts[b] ?? 0)
  )[0] ?? null

  const growthEdgeFromBottomPlan = (() => {
    switch (bottomPlanKey) {
      case 'systemize':
        return 'Impatience with process: systemize work may get delayed when it feels heavier than expected.'
      case 'delegate_founder':
        return 'Ownership drag: you may hold too much yourself, even when delegation would help.'
      case 'eliminate_founder':
        return 'Pruning friction: you might keep extra work around longer than needed.'
      case 'my_zone':
        return 'Focus friction: when stress rises, protecting deep focus may become harder.'
      case 'quick_win_founder':
        return 'Quick-win imbalance: you may overthink and delay the smallest test.'
      default:
        return 'Your growth edge is where your playbook is still forming.'
    }
  })()

  const postponementRiskEdge = topPostponedPlanLabel
    ? topPostponedPlanLabel === 'Systemize'
      ? 'When risk shows up, process-heavy tasks are often the ones you postpone. Start by building a tiny version of the process.'
      : `When risk shows up, your postponements cluster around ${topPostponedPlanLabel}-type work. Start with the smallest next step for that category.`
    : 'When friction hits, your postponements point to the categories that need gentler structure.'

  const growthEdges = [
    growthEdgeFromBottomPlan,
    topPostponedPlanShare >= 0.35
      ? `${postponementRiskEdge} Before you postpone again, write your next smallest step and put a start time on it.`
      : 'Growth edge: when friction hits, shrink the first step and start a timed action - not a full plan.',
    emotionalHits <= 1
      ? 'Growth edge: when stressed, you may under-name emotions. Name how you feel in one sentence before you state the decision.'
      : 'Growth edge: you process emotional signal logically, which is efficient but can leave collaborators feeling unheard. Try: How I feel / What I choose / First step.',
    topPostponedPlanLabel
      ? `Growth edge: when you feel uncertain, your postponements cluster around ${topPostponedPlanLabel}-type work. Instead of planning another round, do one tiny timed first step on the next item.`
      : stressHits >= 3
        ? 'Growth edge: when anxious, you tighten control. Choose one trusted delegation and define a simple decision rule.'
        : 'Growth edge: when you feel stuck, swap extra planning for one small action experiment.',
  ]

  const relationshipsAndWork = duoActive
    ? delegateDominant
      ? 'In duo work, you lead with clarity and trust. Delegation shows up in your playbook, and active partnership keeps accountability real.'
      : 'In duo work, you lead with clarity and a shared playbook. Having a partner keeps your next move aligned with intent.'
    : strategicLeanLabel === 'strategic'
      ? 'You prefer clarity over consensus. You build your playbook internally first - and you invite accountability when execution becomes the bottleneck.'
      : 'You prefer clarity over endless back-and-forth. You move best when you make the smallest commitment that keeps momentum moving.'

  const unlockedFeatureSet = new Set(unlockedFeatureNames ?? [])
  const da = daysActive ?? 0
  const evenings = energyReviewsTotalCount ?? 0
  const energyUnlocked =
    unlockedFeatureSet.has('energy_trends') ||
    da >= SCHEDULE_ENERGY_MIN_DAYS ||
    evenings >= SCHEDULE_ENERGY_MIN_EVENINGS
  const decisionUnlocked = unlockedFeatureSet.has('decision_style') || da >= DECISION_STYLE_MIN_DAYS
  const postponementUnlocked = unlockedFeatureSet.has('postponement_patterns') || da >= POSTPONEMENT_MIN_DAYS

  const energyDaysRemaining = Math.max(0, SCHEDULE_ENERGY_MIN_DAYS - da)
  const decisionDaysRemaining = Math.max(0, DECISION_STYLE_MIN_DAYS - da)
  const postponementDaysRemaining = Math.max(0, POSTPONEMENT_MIN_DAYS - da)

  const energyQualifier =
    energyDaysRemaining <= 0
      ? 'ready soon'
      : energyDaysRemaining <= 1
        ? 'one more day active'
        : 'a few more days active'
  const decisionQualifier =
    decisionDaysRemaining <= 0
      ? 'ready soon'
      : decisionDaysRemaining <= 1
        ? 'one more day active'
        : 'a few more days active'
  const postponementQualifier =
    postponementDaysRemaining <= 0
      ? 'ready soon'
      : postponementDaysRemaining <= 1
        ? 'just one more day'
        : postponementDaysRemaining <= 2
          ? 'a couple more days'
          : 'a few more days'

  const unlockedInsights = [
    energyUnlocked
      ? '🔓 Energy & Mood Trend is unlocked'
      : `Next: Energy & Mood Trend unlocks on day ${SCHEDULE_ENERGY_MIN_DAYS} active (${energyQualifier}), or after ${SCHEDULE_ENERGY_MIN_EVENINGS} evening reviews.`,
    decisionUnlocked
      ? '🔓 Decision Style is unlocked'
      : `Next: Decision Style unlocks on day ${DECISION_STYLE_MIN_DAYS} active (${decisionQualifier}).`,
    (daysActive ?? 0) >= ARCHETYPE_FULL_MIN_DAYS
      ? '🔓 Founder Archetype: full profile unlocked'
      : (daysActive ?? 0) >= ARCHETYPE_PREVIEW_MIN_DAYS
        ? '🔓 Founder Archetype preview — your full breakdown firms up at 30 days'
        : '🔓 Founder Archetype unlocked',
    postponementUnlocked
      ? '🔓 Postponement Patterns is unlocked'
      : `Next: Postponement Patterns unlocks on day ${POSTPONEMENT_MIN_DAYS} active (${postponementQualifier}).`,
  ]

  const personalityProfile = {
    tagline,
    title,
    description,
    recentExampleBox,
    keyCharacteristics,
    strengths,
    growthEdges,
    relationshipsAndWork,
    cognitivePattern: {
      dominant,
      auxiliary,
      underdeveloped,
      stressResponse,
    },
    unlockedInsights,
  }

  return {
    primary: {
      ...primaryDef,
      confidence: clamp(topConfidence, 0, 100),
    },
    ...(secondaryDef
      ? {
          secondary: {
            ...secondaryDef,
            confidence: clamp(secondConfidence, 0, 100),
          },
        }
      : {}),
    traits: {
      strategic: clamp(strategicPct100, 0, 100),
      tactical: clamp(tacticalPct100, 0, 100),
      builder: clamp(Math.round(builderScore), 0, 100),
      visionary: clamp(Math.round(visionaryScore), 0, 100),
    },
    breakdown: {
      signals,
      totalConfidence: clamp(topConfidence, 0, 100),
      explanation,
    },
    personalityProfile,
  }
}

