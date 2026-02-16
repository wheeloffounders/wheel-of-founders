/**
 * Decision Pattern Analysis
 * Analyzes user decisions to identify patterns in the 2x2 matrix
 */

export interface Decision {
  is_needle_mover: boolean | null
  is_proactive: boolean | null
  decision: string
  decision_type: 'strategic' | 'tactical'
}

export interface DecisionPatterns {
  proactiveNeedleMovers: number // Strategic Building
  reactiveNeedleMovers: number // Adaptive Execution
  proactiveNonNeedleMovers: number // Busy Work
  reactiveNonNeedleMovers: number // Firefighting
  total: number
  insight: string
}

/**
 * Analyze decision patterns from a list of decisions
 */
export function analyzeDecisionPatterns(decisions: Decision[]): DecisionPatterns {
  const patterns = {
    proactiveNeedleMovers: 0,
    reactiveNeedleMovers: 0,
    proactiveNonNeedleMovers: 0,
    reactiveNonNeedleMovers: 0,
    total: decisions.length,
    insight: '',
  }

  decisions.forEach((decision) => {
    const isNeedleMover = decision.is_needle_mover === true
    const isProactive = decision.is_proactive === true

    if (isNeedleMover && isProactive) {
      patterns.proactiveNeedleMovers++
    } else if (isNeedleMover && !isProactive) {
      patterns.reactiveNeedleMovers++
    } else if (!isNeedleMover && isProactive) {
      patterns.proactiveNonNeedleMovers++
    } else if (!isNeedleMover && !isProactive) {
      patterns.reactiveNonNeedleMovers++
    }
  })

  // Generate insight
  const total = patterns.total
  if (total === 0) {
    patterns.insight = 'Start tracking your decisions to see patterns emerge.'
    return patterns
  }

  const strategicBuildingPct = (patterns.proactiveNeedleMovers / total) * 100
  const adaptiveExecutionPct = (patterns.reactiveNeedleMovers / total) * 100
  const busyworkPct = (patterns.proactiveNonNeedleMovers / total) * 100
  const firefightingPct = (patterns.reactiveNonNeedleMovers / total) * 100

  const insights: string[] = []

  if (strategicBuildingPct > 40) {
    insights.push(`You're making mostly Strategic Building decisions (${Math.round(strategicBuildingPct)}%)—excellent intentional growth!`)
  } else if (strategicBuildingPct < 20) {
    insights.push(`Consider more Strategic Building—you're at ${Math.round(strategicBuildingPct)}%.`)
  }

  if (adaptiveExecutionPct > 30) {
    insights.push(`You have ${Math.round(adaptiveExecutionPct)}% Adaptive Execution—these might be your most important pivots. Watch for patterns in what triggers these high-impact responses.`)
  }

  if (busyworkPct > 40) {
    insights.push(`Busy Work is ${Math.round(busyworkPct)}% of decisions. These are proactive but not moving the needle—consider focusing on fewer, higher-impact initiatives.`)
  }

  if (firefightingPct > 50) {
    insights.push(`Firefighting dominates (${Math.round(firefightingPct)}%). This is normal, but ensure you're also making Strategic Building decisions.`)
  }

  if (insights.length === 0) {
    patterns.insight = 'Your decision patterns are well-balanced. Keep tracking to see trends over time.'
  } else {
    patterns.insight = insights.join(' ')
  }

  return patterns
}

/**
 * Get quadrant label for a decision
 */
export function getDecisionQuadrant(
  isNeedleMover: boolean | null,
  isProactive: boolean | null
): string {
  if (isNeedleMover === true && isProactive === true) {
    return 'Strategic Building'
  } else if (isNeedleMover === true && isProactive === false) {
    return 'Adaptive Execution'
  } else if (isNeedleMover === false && isProactive === true) {
    return 'Busy Work'
  } else if (isNeedleMover === false && isProactive === false) {
    return 'Firefighting'
  }
  return 'Unclassified'
}
