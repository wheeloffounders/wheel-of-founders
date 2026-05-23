export type WeeklyArchetypeDriftMetrics = {
  needleMoversCompleted: number
  needleMoversTotal: number
  proactivePct: number
  avgMood: number | null
  avgEnergy: number | null
  daysCompleted: number
  daysInWeek: number
  bestDayName: string | null
}

export type ArchetypeDriftContext = {
  primaryName: string | null
  primaryLabel: string | null
}

export function computeWeeklyBlueprintMatch(
  metrics: WeeklyArchetypeDriftMetrics,
  archetype: ArchetypeDriftContext,
): number {
  const needlePct =
    metrics.needleMoversTotal > 0
      ? (metrics.needleMoversCompleted / metrics.needleMoversTotal) * 100
      : null
  const showUpPct = metrics.daysInWeek > 0 ? (metrics.daysCompleted / metrics.daysInWeek) * 100 : 0
  const moodPct = metrics.avgMood != null ? (metrics.avgMood / 5) * 100 : null
  const energyPct = metrics.avgEnergy != null ? (metrics.avgEnergy / 5) * 100 : null

  const execution = needlePct ?? showUpPct
  const vitality =
    moodPct != null && energyPct != null
      ? (moodPct + energyPct) / 2
      : moodPct ?? energyPct ?? 72

  let alignment = execution * 0.5 + vitality * 0.25 + showUpPct * 0.25

  const name = archetype.primaryName?.toLowerCase()
  if (name === 'builder' && metrics.proactivePct >= 55) alignment += 4
  if (name === 'strategist' && showUpPct >= 85) alignment += 3
  if (name === 'hustler' && execution >= 70) alignment += 3
  if (name === 'visionary' && vitality >= 75) alignment += 2

  return Math.round(Math.min(97, Math.max(58, alignment)))
}

export function buildWeeklyArchetypeDriftSummary(
  metrics: WeeklyArchetypeDriftMetrics,
  matchPct: number,
  archetype: ArchetypeDriftContext,
): string {
  const label = archetype.primaryLabel ?? 'founder blueprint'
  const best = metrics.bestDayName

  if (matchPct >= 85) {
    if (best) {
      return `Your execution rhythm this week tracked closely with your ${label} pattern. Needle movers and energy clustered strongest on ${best} — deep-work blocks landing where your archetype expects them.`
    }
    return `Your execution rhythm matches your core ${label} pattern. Completion cadence and energy signals stayed aligned with how you typically do your best work.`
  }

  if (matchPct >= 70) {
    return `You stayed largely in sync with your ${label} blueprint, with a few pockets of drift mid-week. Tightening morning intention on lighter days would pull the match closer to your archetype sweet spot.`
  }

  if (best) {
    return `This week diverged from your ${label} baseline — but ${best} showed where your natural rhythm still wants to lead. Anchor next week’s first deep block to that window.`
  }

  return `This week sat below your ${label} rhythm baseline. Two protected focus blocks would rebuild the alignment Mrs. Deer sees in your archetype profile.`
}
