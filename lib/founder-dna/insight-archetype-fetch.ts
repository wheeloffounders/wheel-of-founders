import { toInsightArchetypeVoice, type InsightArchetypeVoice } from '@/lib/founder-dna/insight-archetype-voice'

let voicePromise: Promise<InsightArchetypeVoice | null> | null = null

const VOICE_CACHE_LISTENER_KEY = '__wofInsightVoiceCacheListeners'

if (typeof window !== 'undefined' && !(window as unknown as Record<string, boolean>)[VOICE_CACHE_LISTENER_KEY]) {
  ;(window as unknown as Record<string, boolean>)[VOICE_CACHE_LISTENER_KEY] = true
  const clear = () => {
    voicePromise = null
  }
  window.addEventListener('archetype-updated', clear)
  window.addEventListener('data-sync-request', clear)
}

/**
 * Single in-flight fetch for primary archetype voice (shared by all DnaInsightBlocks on a page).
 */
export function getInsightArchetypeVoiceCached(): Promise<InsightArchetypeVoice | null> {
  if (!voicePromise) {
    voicePromise = fetch('/api/founder-dna/archetype', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { primary?: { name?: string } } | null) =>
        json?.primary?.name ? toInsightArchetypeVoice(json.primary.name) : null
      )
      .catch(() => null)
  }
  return voicePromise
}

/** Test / Storybook only */
export function resetInsightArchetypeVoiceCacheForTests(): void {
  voicePromise = null
}
