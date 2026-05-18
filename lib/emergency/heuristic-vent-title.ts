/** First-line headline guess for freemium quick sort (no AI). */
export function heuristicEmergencyVentTitle(vent: string): string {
  const line = (vent.split(/\n/)[0] ?? vent).trim()
  if (!line) return ''
  if (line.length <= 80) return line
  return `${line.slice(0, 77)}…`
}
