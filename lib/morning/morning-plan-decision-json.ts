import { isActionPlanMatrixKey, parseAISuggestedActionTypeToMatrixKey } from '@/lib/morning/pro-action-matrix'
import type { DecisionStrategyOption } from '@/lib/morning/pro-morning-oracle'

export type MorningPlanDecisionJsonExtras = {
  decision_strategies: DecisionStrategyOption[]
  decision_strategies_prebaked_at: string | null
}

/** True if autosave row has a usable 3-card strategy tray (instant morning hydration). */
export function hasPrebakedDecisionStrategiesInAutosave(decisionJson: unknown): boolean {
  return parsePrebakedDecisionStrategies(decisionJson) !== null
}

export function parsePrebakedDecisionStrategies(
  decisionJson: unknown
): { strategies: DecisionStrategyOption[]; prebakedAt: string | null } | null {
  if (!decisionJson || typeof decisionJson !== 'object') return null
  const o = decisionJson as Record<string, unknown>
  const raw = o.decision_strategies
  if (!Array.isArray(raw) || raw.length === 0) return null
  const cleaned = raw
    .slice(0, 3)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const x = item as Record<string, unknown>
      const label = typeof x.label === 'string' ? x.label.trim() : ''
      const text = typeof x.text === 'string' ? x.text.trim() : ''
      const reasoning = typeof x.reasoning === 'string' ? x.reasoning.trim() : ''
      if (!label || !text) return null
      const rawSap =
        x.suggestedActionPlan ??
        x.suggested_action_plan ??
        x.recommended_action ??
        x.recommendedAction
      const sapTrimmed = typeof rawSap === 'string' ? rawSap.trim() : ''
      const isAiSlug = /^(milestone|systemize|delegate|let_go|quick_win)$/i.test(sapTrimmed)
      const suggestedActionPlan = sapTrimmed
        ? isActionPlanMatrixKey(sapTrimmed)
          ? sapTrimmed
          : isAiSlug
            ? parseAISuggestedActionTypeToMatrixKey(sapTrimmed)
            : undefined
        : undefined
      const rawWhy = x.actionTypeWhy ?? x.action_type_why
      const actionTypeWhy =
        typeof rawWhy === 'string' && rawWhy.trim() ? rawWhy.trim() : undefined
      const base: DecisionStrategyOption = { label, text, reasoning: reasoning || '' }
      if (suggestedActionPlan) base.suggestedActionPlan = suggestedActionPlan
      if (actionTypeWhy) base.actionTypeWhy = actionTypeWhy
      return base
    })
    .filter((x): x is DecisionStrategyOption => x !== null)
  if (cleaned.length < 3) return null
  const prebakedAt =
    typeof o.decision_strategies_prebaked_at === 'string' && o.decision_strategies_prebaked_at.trim()
      ? o.decision_strategies_prebaked_at.trim()
      : null
  return { strategies: cleaned, prebakedAt }
}
