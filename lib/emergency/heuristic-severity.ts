import type { EmergencyVentSeverity } from '@/lib/emergency/parse-emergency'

/** Fast, local-only severity guess when AI sort is unavailable (freemium). */
export function heuristicEmergencySeverity(text: string): EmergencyVentSeverity {
  const t = text.toLowerCase()
  if (t.length < 4) return 'warm'

  const contained =
    /\b(ok now|all good|handled|minor issue|small thing|not urgent|already fixed|under control|nvm|nevermind|false alarm|just annoyed)\b/.test(
      t
    )
  if (contained) return 'contained'

  const hot =
    /\b(down|outage|lawsuit|legal\b|panic|disaster|critical|emergency|on fire|everything\b.*\b(broke|broken)|escalat|breach|hack|lost (the |our )?(deal|client)|server(s)? (is |are )?down|production)\b/.test(
      t
    )
  if (hot) return 'hot'

  return 'warm'
}
