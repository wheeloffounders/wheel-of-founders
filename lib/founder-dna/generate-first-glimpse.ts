import { generateAIPrompt } from '@/lib/ai-client'

export type FirstGlimpseSourcePayload = {
  taskDescriptions: string
  decisionText: string
  winsText: string
  lessonsText: string
}

function isMockFirstGlimpseEnvEnabled(): boolean {
  const v = process.env.FIRST_GLIMPSE_MOCK_INSIGHTS
  return v === '1' || v === 'true'
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^[\s\n]*```(?:\w+)?\s*/i, '')
    .replace(/\s*```[\s\n]*$/i, '')
    .trim()
}

const REQUIRED_CLOSER = "Don't miss it — check back tomorrow to see what Mrs. Deer noticed."

function normalizeInsight(raw: string): string {
  let t = stripCodeFences(raw.trim())
  t = t.replace(/^Mrs\.?\s*Deer\s*:\s*/i, '').replace(/^Mrs\.?\s*Deer\s+/i, '').trim()
  return t
}

export function firstGlimpseFallback(source: FirstGlimpseSourcePayload): string {
  const snippet = [source.winsText, source.lessonsText].map((s) => s.trim()).find(Boolean) ?? ''
  const quoted = snippet ? `“${snippet.length > 100 ? `${snippet.slice(0, 100)}…` : snippet}”` : 'what you wrote'
  return (
    `I noticed something about you already: you’re willing to name ${quoted} out loud. ` +
    `Each evening reflection shapes the next morning’s insight — tomorrow, yours will be waiting. ` +
    REQUIRED_CLOSER
  )
}

/**
 * Single warm “First Glimpse” message: personal signal, morning preview, promise + required closer.
 */
export async function generateFirstGlimpseInsight(source: FirstGlimpseSourcePayload): Promise<string> {
  if (isMockFirstGlimpseEnvEnabled()) {
    return (
      `[Mock First Glimpse] I noticed something about you already: you showed up for your first evening. ` +
      `Tomorrow morning, your first insight will be waiting. ${REQUIRED_CLOSER}`
    )
  }

  const systemPrompt = `You are Mrs. Deer, a gentle AI companion for a founder.

The user already sees their full post-evening insight in the UI above this message. Do NOT repeat or summarize that entire insight.

OUTPUT RULES (strict):
- Reply with plain prose only (no JSON, no markdown headings, no bullet list).
- Under 160 words.
- Use exactly these layers in order:
  1) Personal signal: start with "I noticed something about you already:" then one specific observation; quote very short phrases from their own words.
  2) Bridge: one or two sentences that each evening reflection shapes the next morning’s insight; tomorrow morning their first morning insight will be waiting as a gentle nudge.
  3) Light FOMO: if they skip tomorrow, they miss that personalized thread (say this kindly, not harsh).
- End with this EXACT final sentence: ${JSON.stringify(REQUIRED_CLOSER)}
- Do not prepend "Mrs. Deer" as a speaker label.`

  const userPrompt = `The user just completed their first full day cycle. Here's what they wrote:

Morning tasks (descriptions):
${source.taskDescriptions || '(none recorded)'}

Morning decisions:
${source.decisionText || '(none recorded)'}

Evening wins:
${source.winsText || '(none)'}

Evening lessons:
${source.lessonsText || '(none)'}

Write the First Glimpse message now.`

  try {
    const raw = (
      await generateAIPrompt({
        systemPrompt,
        userPrompt,
        maxTokens: 500,
        temperature: 0.72,
      })
    ).trim()

    let out = normalizeInsight(raw)
    if (!out.includes(REQUIRED_CLOSER)) {
      out = `${out.trim()}\n\n${REQUIRED_CLOSER}`
    }
    return out
  } catch (e) {
    console.error('[FirstGlimpse] generateFirstGlimpseInsight error:', e)
    return firstGlimpseFallback(source)
  }
}
