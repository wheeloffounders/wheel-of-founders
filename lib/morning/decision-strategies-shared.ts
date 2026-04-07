import {
  isActionPlanMatrixKey,
  parseAISuggestedActionTypeToMatrixKey,
} from '@/lib/morning/pro-action-matrix'
import {
  composeMrsDeerDecisionStrategies,
  type DecisionStrategyOption,
  type ProOracleContext,
} from '@/lib/morning/pro-morning-oracle'
import { sanitizeAiCardLabelText, sanitizeAiJsonText } from '@/lib/morning/sanitize-ai-json-text'

export function inferDecisionSignalProfile(ctx: ProOracleContext): 'low' | 'friction' | 'steady' | 'mixed' {
  if (
    ctx.currentStreak === 0 &&
    ctx.eveningDaysLast14 <= 1 &&
    ctx.activeMorningDaysLast14 <= 1 &&
    ctx.postponementsLast14 < 2
  ) {
    return 'low'
  }
  if (ctx.postponementsLast14 >= 3) {
    return 'friction'
  }
  if (ctx.eveningDaysLast14 >= 5 && ctx.activeMorningDaysLast14 >= 5 && ctx.postponementsLast14 < 3) {
    return 'steady'
  }
  return 'mixed'
}

export function parseDecisionStrategies(raw: string): DecisionStrategyOption[] {
  const t = sanitizeAiJsonText(raw).trim()
  try {
    const parsed = JSON.parse(t) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .slice(0, 3)
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const o = item as Record<string, unknown>
        const labelRaw = typeof o.label === 'string' ? o.label.trim() : ''
        const textRaw = typeof o.text === 'string' ? o.text.trim() : ''
        const reasoningRaw = typeof o.reasoning === 'string' ? o.reasoning.trim() : ''
        const label = labelRaw ? sanitizeAiCardLabelText(labelRaw) || labelRaw : ''
        const text = textRaw ? sanitizeAiCardLabelText(textRaw) || textRaw : ''
        const reasoning = reasoningRaw ? sanitizeAiCardLabelText(reasoningRaw) || reasoningRaw : ''
        if (!label || !text) return null
        const rawType = o.action_type ?? o.actionType ?? o.recommended_action ?? o.recommendedAction
        const rawWhy = o.action_type_why ?? o.actionTypeWhy
        let suggestedActionPlan: DecisionStrategyOption['suggestedActionPlan']
        if (typeof rawType === 'string' && rawType.trim()) {
          const t = rawType.trim()
          suggestedActionPlan = isActionPlanMatrixKey(t) ? t : parseAISuggestedActionTypeToMatrixKey(t)
        }
        const whyRaw = typeof rawWhy === 'string' && rawWhy.trim() ? rawWhy.trim() : ''
        const actionTypeWhy = whyRaw ? sanitizeAiCardLabelText(whyRaw) || whyRaw : undefined
        const out: DecisionStrategyOption = { label, text, reasoning: reasoning || '' }
        if (suggestedActionPlan) out.suggestedActionPlan = suggestedActionPlan
        if (actionTypeWhy) out.actionTypeWhy = actionTypeWhy
        return out
      })
      .filter((x): x is DecisionStrategyOption => x !== null)
  } catch {
    return []
  }
}

export function mergeStrategiesWithFallback(
  parsed: DecisionStrategyOption[],
  ctx: ProOracleContext
): DecisionStrategyOption[] {
  const fb = composeMrsDeerDecisionStrategies(ctx)
  return [0, 1, 2].map((i) => {
    const p = parsed[i]
    const f = fb[i]!
    if (!p) return f
    return {
      ...p,
      suggestedActionPlan: p.suggestedActionPlan ?? f.suggestedActionPlan,
      actionTypeWhy: p.actionTypeWhy?.trim() || f.actionTypeWhy?.trim() || undefined,
    }
  })
}
