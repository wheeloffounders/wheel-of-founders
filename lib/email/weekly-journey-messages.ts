/**
 * Week-of-journey copy for weekly insight emails (from days with entries, not ISO week).
 */
export function journeyWeekNumberFromDaysWithEntries(daysWithEntries: number): number {
  const d = Math.max(0, Math.floor(Number(daysWithEntries) || 0))
  return Math.max(1, Math.ceil(d / 7))
}

export function getWeeklyJourneyMessage(weekNumber: number, daysWithEntries?: number): string {
  const w = Math.max(1, Math.floor(Number(weekNumber) || 1))
  switch (w) {
    case 1: {
      const raw =
        typeof daysWithEntries === 'number' && Number.isFinite(daysWithEntries)
          ? Math.max(0, Math.floor(daysWithEntries))
          : 0
      const n = Math.max(1, raw)
      const dayLabel = n === 1 ? 'day' : 'days'
      return `You showed up ${n} ${dayLabel} in a row. That's not luck — that's you becoming someone who builds rhythm.`
    }
    case 2:
      return "Two weeks. The beginning is behind you. Now you're building momentum — and it's starting to feel less like effort and more like habit."
    case 3:
      return "Three weeks. You're becoming someone who doesn't just start — you continue. That's harder than starting, and you're doing it."
    case 4:
      return "One month. You're becoming someone who trusts the process, even when results aren't instant. That's the foundation of everything."
    default:
      return "You're not just showing up anymore. You're building something — a rhythm, a practice, a way of working that holds you."
  }
}
