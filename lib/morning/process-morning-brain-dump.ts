import type { ActionPlanMatrixKey } from '@/lib/morning/pro-action-matrix'
import { ProMorningAIError } from '@/lib/morning/pro-morning-api'
import { sanitizeAiJsonText } from '@/lib/morning/sanitize-ai-json-text'

export type BrainDumpTask = {
  title: string
  actionPlan: ActionPlanMatrixKey
}

export type MorningBrainDumpResult = {
  tasks: BrainDumpTask[]
  overflow: string[]
  /** Optional mindset framing (secondary to core objective). */
  decision: string | null
  /** Primary needle mover / Daily pivot — maps to \`morning_decisions.decision\` / autosave decision_json. */
  core_objective: string | null
}

export { sanitizeAiJsonText }

/**
 * @deprecated Alias for {@link sanitizeAiJsonText} (same behavior).
 */
export function cleanBrainDumpJsonText(raw: string): string {
  return sanitizeAiJsonText(raw)
}

/**
 * POST `/api/ai/morning-brain-dump` — turns a spoken brain dump into ranked tasks + matrix labels.
 * Server-side parsing uses {@link sanitizeAiJsonText} so Markdown fences cannot break extraction.
 */
export async function processMorningBrainDump(params: {
  transcript: string
  decision: string
  /** Librarian may return up to this many tasks (clamped server-side to 2–10). */
  maxTasks: number
}): Promise<MorningBrainDumpResult> {
  const res = await fetch('/api/ai/morning-brain-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      transcript: params.transcript.trim(),
      decision: params.decision.trim(),
      maxTasks: params.maxTasks,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    tasks?: BrainDumpTask[]
    overflow?: string[]
    decision?: string | null
    core_objective?: string | null
  }
  if (res.status === 403) {
    throw new ProMorningAIError(data.error || 'Pro morning AI requires Pro or trial access', 403)
  }
  if (!res.ok) {
    throw new ProMorningAIError(data.error || `Request failed (${res.status})`, res.status)
  }
  const decisionRaw = data.decision
  const decision =
    typeof decisionRaw === 'string' && decisionRaw.trim().length >= 12 ? decisionRaw.trim().slice(0, 600) : null

  const coRaw = data.core_objective
  const core_objective =
    typeof coRaw === 'string' && coRaw.trim().length >= 8 ? coRaw.trim().slice(0, 600) : null

  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    overflow: Array.isArray(data.overflow) ? data.overflow : [],
    decision,
    core_objective,
  }
}
