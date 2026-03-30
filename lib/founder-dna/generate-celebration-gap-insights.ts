import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAIPrompt } from '@/lib/ai-client'
import { loadYourStoryFounderContext } from '@/lib/founder-dna/generate-your-story-insights'

function isMockCelebrationGapEnvEnabled(): boolean {
  const v = process.env.CELEBRATION_GAP_MOCK_INSIGHTS
  return v === '1' || v === 'true'
}

export function normalizeCelebrationGapInsightLine(s: string): string {
  let t = s.trim().replace(/^["']+|["']+$/g, '')
  t = t
    .replace(/^Mrs\.?\s*Deer\s*:\s*/i, '')
    .replace(/^Mrs\.?\s*Deer\s+/i, '')
    .trim()
  return t
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^[\s\n]*```(?:\w+)?\s*/i, '')
    .replace(/\s*```[\s\n]*$/i, '')
    .trim()
}

/** When AI fails — still personal, quotes a slice of their lesson. */
export function hiddenWinInsightFallback(lessonText: string): string {
  const t = lessonText.trim()
  if (!t) {
    return 'Mrs. Deer couldn’t find a lesson in your recent evenings yet. When you write even a few honest words about what felt hard, she’ll hold up a mirror here.'
  }
  const q = t.length > 220 ? `${t.slice(0, 220)}…` : t
  return `You wrote: “${q}” What feels like a problem often holds a quiet win — maybe you’re already noticing, naming, or caring more than you credit yourself for. Next time this comes up, try finishing: “Even in this, I already…”`
}

/** Primary goal + decision mix. */
export async function loadCelebrationGapAiContext(db: SupabaseClient, userId: string): Promise<string> {
  const [profileRes, decisionCtx] = await Promise.all([
    db.from('user_profiles').select('primary_goal_text').eq('id', userId).maybeSingle(),
    loadYourStoryFounderContext(db, userId),
  ])
  const goal = (profileRes.data as { primary_goal_text?: string } | null)?.primary_goal_text?.trim()
  const parts: string[] = []
  if (goal) {
    const clipped = goal.length > 240 ? `${goal.slice(0, 240)}…` : goal
    parts.push(`Their stated focus (from onboarding): "${clipped}"`)
  }
  parts.push(decisionCtx)
  return parts.join('\n\n')
}

/**
 * One Mrs. Deer “mirror” — hidden win inside a single lesson. Plain text (no JSON).
 */
export async function generateHiddenWinMirrorInsight(args: {
  lessonText: string
  founderContext: string
}): Promise<string> {
  const { lessonText, founderContext } = args
  const trimmed = lessonText.trim()
  if (!trimmed) return hiddenWinInsightFallback('')

  if (isMockCelebrationGapEnvEnabled()) {
    const clip = trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed
    console.log('[CelebrationGap] MOCK MODE — hidden win mirror')
    return `[Mock] You wrote: “${clip}” Mrs. Deer would name what’s already working here and invite your next sentence — turn off CELEBRATION_GAP_MOCK_INSIGHTS for the real mirror.`
  }

  const systemPrompt = `You are Mrs. Deer — warm, gentle, observant, never judgmental.

OUTPUT RULES (strict):
- Reply with ONLY the insight paragraph. No title, no JSON, no markdown code fences, no bullet list.
- 2–4 sentences maximum.
- The user believes this lesson describes a problem or something to fix. Your job is to hold up a mirror: show the hidden win — something they’re already doing that they don’t see.
- Structure:
  1) Quote their exact words once (use straight double quotes around a short phrase from their lesson).
  2) Name what’s actually working (self-awareness, care, honesty, persistence, reflection, etc.) — be specific to THEIR words.
  3) Offer a gentle reframe in plain language.
  4) End with a soft invitation (e.g. a sentence stem they could try next time).
- Do NOT include the words "Mrs. Deer" or "Mrs Deer".
- Do not shame or minimize their struggle.`

  const userPrompt = `${founderContext}

The user wrote this lesson (they think it’s a problem to fix):

"""
${trimmed}
"""

Write the mirror insight only.`

  console.log('[CelebrationGap] Hidden-win mirror: preparing AI prompt…')

  try {
    const raw = stripCodeFences(
      (
        await generateAIPrompt({
          systemPrompt,
          userPrompt,
          maxTokens: 500,
          temperature: 0.68,
        })
      ).trim(),
    )

    const normalized = normalizeCelebrationGapInsightLine(raw)
    if (normalized.length < 20) {
      console.warn('[CelebrationGap] Mirror insight too short; fallback')
      return hiddenWinInsightFallback(trimmed)
    }
    console.log('[CelebrationGap] Mirror insight length:', normalized.length)
    return normalized
  } catch (e) {
    console.error('[CelebrationGap] generateHiddenWinMirrorInsight error:', e)
    return hiddenWinInsightFallback(trimmed)
  }
}
