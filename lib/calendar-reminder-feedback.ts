/** Hour from HTML time value "HH:mm" (uses clock hour only). */
export function hourFromTimeString(time: string): number {
  const h = parseInt(time.split(':')[0] ?? '0', 10)
  return Number.isFinite(h) ? h : 9
}

export function mrsDeerLineForMorningHour(hour: number): string {
  if (hour >= 4 && hour <= 8) {
    return "Early start! I'll be here with your coffee."
  }
  if (hour >= 9 && hour <= 11) {
    return "A steady start. Let's tackle those needle movers."
  }
  return 'Pick a time that fits how you like to start the day.'
}

export function mrsDeerLineForEveningHour(hour: number): string {
  if (hour >= 19 && hour <= 21) {
    return 'The perfect time to wind down and reflect.'
  }
  if (hour >= 22 || hour === 0) {
    return "Burning the midnight oil? Don't forget to rest, Founder."
  }
  return 'Your evening check-in is a gift to tomorrow-you.'
}

/** Turn free-text goals into natural "how the ___ went" phrasing (e.g. launching X → the X work). */
export function humanizeCalendarHint(raw: string | null | undefined): string {
  const trimmed = raw?.trim().replace(/\s*\.\s*$/, '') ?? ''
  if (!trimmed) return 'today'
  let s = trimmed.slice(0, 80)
  const launch = s.match(/^(?:launching|to launch)\s+(.+)$/i)
  if (launch?.[1]) {
    return `${launch[1].trim()} work`
  }
  const toVerb = s.match(/^to\s+(.+)$/i)
  if (toVerb?.[1]) {
    const rest = toVerb[1].trim()
    return rest.length > 0 ? rest : s
  }
  return s
}

/** Short task label for calendar success: "how the [task] went". */
export function firstTaskDescriptionForCalendarSuccess(raw: string | null | undefined): string {
  const trimmed = raw?.trim().replace(/\s*\.\s*$/, '') ?? ''
  if (!trimmed) return ''
  let s = trimmed.slice(0, 80)
  const launch = s.match(/^(?:launching|to launch)\s+(.+)$/i)
  if (launch?.[1]) return launch[1].trim()
  const toVerb = s.match(/^to\s+(.+)$/i)
  if (toVerb?.[1]) {
    const rest = toVerb[1].trim()
    return rest.length > 0 ? rest : s
  }
  return s
}

export function buildCalendarPersonalSuccessLine(hint: string | null | undefined): string {
  const task = firstTaskDescriptionForCalendarSuccess(hint)
  if (!task) {
    return "✅ Connected! I'll nudge you tonight to see how your day went."
  }
  return `✅ Connected! I'll nudge you tonight to see how the ${task} went.`
}
