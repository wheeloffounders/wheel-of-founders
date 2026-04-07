import { generateAIPrompt } from '@/lib/ai-client'

/**
 * Turn rough containment notes into a calm, numbered tactical list (Mrs. Deer voice).
 */
export async function refineContainmentPlanText(params: {
  fireDescription: string
  triageContext: string | null
  rawPlan: string
}): Promise<string> {
  const triageBlock =
    params.triageContext && params.triageContext.trim().length > 0
      ? params.triageContext
      : '(No triage JSON yet — focus on the user’s notes.)'

  const systemPrompt = `You are Mrs. Deer, a calm executive coach for founders in crisis. Your job is to rewrite the user's rough containment notes into a clear, numbered tactical plan.

Rules:
- Output ONLY the refined plan (no preamble, no closing cheer).
- Use 2–5 numbered lines (1. 2. 3. …).
- Each line is one concrete action: short, professional, emotionally regulated.
- Preserve the user's intent; do not invent new facts or stakeholders.
- If the input is messy or emotional, strip emotion and keep the moves.`

  const userPrompt = `## Fire (what they reported)
${params.fireDescription}

## Triage context (JSON or text)
${triageBlock}

## User's rough tactical notes (verbatim)
${params.rawPlan}

Rewrite into a numbered, CEO-ready containment plan.`

  return generateAIPrompt({
    systemPrompt,
    userPrompt,
    maxTokens: 600,
    temperature: 0.45,
  })
}
