import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAIPrompt } from '@/lib/ai-client'
import { YOUR_STORY_INSIGHT_FALLBACK } from '@/lib/founder-dna/your-story-shared'

export type StoryWinInput = {
  text: string
  date: string
  formattedDate: string
}

/** Read at runtime so .env.local changes apply after dev server restart (not module-load cache). */
function isMockInsightsEnvEnabled(): boolean {
  const v = process.env.YOUR_STORY_MOCK_INSIGHTS
  return v === '1' || v === 'true'
}

/** Strip duplicate "Mrs. Deer" if the model ignored instructions; trim quotes. */
export function normalizeMrsDeerInsightLine(s: string): string {
  let t = s.trim().replace(/^["']+|["']+$/g, '')
  t = t
    .replace(/^Mrs\.?\s*Deer\s*:\s*/i, '')
    .replace(/^Mrs\.?\s*Deer\s+/i, '')
    .trim()
  return t
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^[\s\n]*```(?:json)?\s*/i, '')
    .replace(/\s*```[\s\n]*$/i, '')
    .trim()
}

/**
 * Parse {"insights": string[]} from model output; tolerate preamble and fences.
 */
function parseInsightsArrayFromModelText(raw: string, expectedLen: number): string[] | null {
  const cleaned = stripCodeFences(raw.trim())

  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }

  const asInsights = (val: unknown): string[] | null => {
    if (!val || typeof val !== 'object') return null
    if (Array.isArray(val)) {
      return val.map((x) => (typeof x === 'string' ? x : ''))
    }
    const insights = (val as { insights?: unknown }).insights
    if (!Array.isArray(insights)) return null
    return insights.map((x) => (typeof x === 'string' ? x : ''))
  }

  let parsed: unknown = tryParse(cleaned)
  let arr = asInsights(parsed)
  if (arr) {
    if (arr.length !== expectedLen) {
      console.warn(`[YourStory] Expected ${expectedLen} insights, got ${arr.length}`)
    }
    return arr
  }

  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj >= 0 && endObj > startObj) {
    parsed = tryParse(cleaned.slice(startObj, endObj + 1))
    arr = asInsights(parsed)
    if (arr) {
      if (arr.length !== expectedLen) {
        console.warn(`[YourStory] Expected ${expectedLen} insights, got ${arr.length} (object slice)`)
      }
      return arr
    }
  }

  const startArr = cleaned.indexOf('[')
  const endArr = cleaned.lastIndexOf(']')
  if (startArr >= 0 && endArr > startArr) {
    parsed = tryParse(cleaned.slice(startArr, endArr + 1))
    if (Array.isArray(parsed)) {
      const mapped = parsed.map((x) => (typeof x === 'string' ? x : ''))
      if (mapped.length !== expectedLen) {
        console.warn(`[YourStory] Expected ${expectedLen} insights, got ${mapped.length} (array slice)`)
      }
      return mapped
    }
  }

  console.warn('[YourStory] Could not parse insights JSON; snippet:', cleaned.slice(0, 280))
  return null
}

function mockInsightsForWins(wins: StoryWinInput[]): string[] {
  return wins.map((w, i) => {
    const snippet = w.text.trim().substring(0, 50)
    return `Mock insight #${i + 1}: ${snippet}${w.text.length > 50 ? '...' : ''}`
  })
}

/** Light founder signal for personalization (decision mix). */
export async function loadYourStoryFounderContext(db: SupabaseClient, userId: string): Promise<string> {
  try {
    const [strategicRes, tacticalRes] = await Promise.all([
      db
        .from('morning_decisions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('decision_type', 'strategic'),
      db
        .from('morning_decisions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('decision_type', 'tactical'),
    ])
    const strategic = strategicRes.count ?? 0
    const tactical = tacticalRes.count ?? 0
    const total = strategic + tactical
    if (total === 0) {
      return 'They are still building a decision log — read each win on its own terms.'
    }
    const sp = Math.round((strategic / total) * 100)
    return `Optional context: they have logged about ${sp}% strategic vs ${100 - sp}% tactical decisions (${total} total). Use only if it helps you reflect a win; the win text is always primary.`
  } catch {
    return 'Use only the win text and dates below.'
  }
}

/**
 * One batched Mrs. Deer call: exactly one short insight per win, order preserved.
 */
export async function generateMrsDeerWinInsightsBatch(args: {
  wins: StoryWinInput[]
  founderContext: string
}): Promise<string[]> {
  const { wins, founderContext } = args
  if (wins.length === 0) return []

  console.log('[YourStory] Starting batch generation')
  console.log('[YourStory] Wins count:', wins.length)
  console.log('[YourStory] First win text:', wins[0]?.text?.substring(0, 100))
  console.log(
    '[YourStory] Win texts:',
    wins.map((w) => w.text.slice(0, 80) + (w.text.length > 80 ? '…' : '')),
  )

  if (isMockInsightsEnvEnabled()) {
    console.log('[YourStory] MOCK MODE ENABLED')
    return mockInsightsForWins(wins)
  }

  console.log('[YourStory] Preparing AI prompt...')

  const list = wins.map((w, i) => `${i + 1}. [${w.formattedDate}] "${w.text}"`).join('\n')

  const systemPrompt = `You are Mrs. Deer — warm, gentle, observant, never judgmental.

OUTPUT RULES (strict):
- Reply with ONLY valid JSON. No markdown code fences. No commentary before or after the JSON.
- Shape: {"insights":["...","..."]}
- The array MUST have exactly ${wins.length} strings, in the same order as the numbered wins.
- Each string is ONE concise line (max ~140 characters) about what THAT win reveals about this founder.
- Be specific to the words in that win; do not reuse the same wording across items.
- Do NOT include the words "Mrs. Deer" or "Mrs Deer" anywhere in any string.
- No bullet characters. Plain sentences or fragments are fine.`

  const userPrompt = `${founderContext}

Here are their recent wins (each needs its own insight):

${list}

Return only this JSON shape with ${wins.length} strings: {"insights":["..."]}`

  try {
    const raw = (
      await generateAIPrompt({
        systemPrompt,
        userPrompt,
        maxTokens: 700,
        temperature: 0.65,
      })
    ).trim()

    console.log('[YourStory] AI response received')
    console.log('[YourStory] Response raw type:', typeof raw)
    console.log('[YourStory] Response raw length:', raw.length)
    if (raw.length < 500) {
      console.log('[YourStory] Response raw:', raw)
    } else {
      console.log('[YourStory] Response raw (first 500 chars):', raw.slice(0, 500))
    }

    console.log('[YourStory] Attempting to parse JSON insights…')
    const arr = parseInsightsArrayFromModelText(raw, wins.length)
    if (!arr) {
      console.warn('[YourStory] Parse failed; using fallback for all wins')
      return wins.map(() => YOUR_STORY_INSIGHT_FALLBACK)
    }

    console.log('[YourStory] Parsed insights count:', arr.length)
    console.log('[YourStory] First parsed insight:', arr[0])

    const normalized = arr.map((x) => normalizeMrsDeerInsightLine(x))
    while (normalized.length < wins.length) normalized.push('')
    const sliced = normalized.slice(0, wins.length)
    const out = sliced.map((s) => (s.length > 0 ? s : YOUR_STORY_INSIGHT_FALLBACK))

    console.log('[YourStory] Final normalized count:', out.length, 'first:', out[0]?.slice(0, 80))
    console.log('[YourStory] Returning insights to caller')
    return out
  } catch (e) {
    console.error('[YourStory] generateMrsDeerWinInsightsBatch error:', e)
    return wins.map(() => YOUR_STORY_INSIGHT_FALLBACK)
  }
}

export function attachInsightsToWins(
  wins: StoryWinInput[],
  insights: string[]
): Array<StoryWinInput & { mrsDeerInsight: string }> {
  const attached = wins.map((w, i) => {
    const line = normalizeMrsDeerInsightLine(insights[i] ?? '')
    return {
      ...w,
      mrsDeerInsight: line.length > 0 ? line : YOUR_STORY_INSIGHT_FALLBACK,
    }
  })
  console.log(
    '[YourStory] attachInsightsToWins done; sample:',
    attached[0] ? { text: attached[0].text.slice(0, 40), insight: attached[0].mrsDeerInsight.slice(0, 60) } : null,
  )
  return attached
}
