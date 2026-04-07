import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'
import { MRS_DEER_RULES } from '@/lib/mrs-deer'
import type { EmergencyTriageJson, EmergencyTriageStrategy } from '@/lib/types/emergency-triage'

export type { EmergencyTriageJson, EmergencyTriageStrategy } from '@/lib/types/emergency-triage'

export async function loadMorningTasksForTriage(
  userId: string,
  planDate: string
): Promise<{ description: string; needleMover: boolean | null }[]> {
  const db = getServerSupabase()
  const { data: autosaveRaw } = await db
    .from('morning_plan_autosave')
    .select('tasks_json')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .maybeSingle()

  const autosave = autosaveRaw as { tasks_json?: unknown } | null
  const raw = autosave?.tasks_json
  if (Array.isArray(raw) && raw.length > 0) {
    const out = raw
      .map((t: Record<string, unknown>) => {
        const description = typeof t.description === 'string' ? t.description.trim() : ''
        const nm =
          typeof t.needleMover === 'boolean'
            ? t.needleMover
            : typeof t.needle_mover === 'boolean'
              ? t.needle_mover
              : null
        return { description, needleMover: nm }
      })
      .filter((x) => x.description.length > 0)
    if (out.length > 0) return out
  }

  const { data: rows } = await db
    .from('morning_tasks')
    .select('description, needle_mover')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .order('task_order', { ascending: true })

  return (rows ?? [])
    .map((r: { description?: string | null; needle_mover?: boolean | null }) => ({
      description: String(r.description ?? '').trim(),
      needleMover: r.needle_mover === true ? true : r.needle_mover === false ? false : null,
    }))
    .filter((x) => x.description.length > 0)
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m)
  if (fence?.[1]) return fence[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

function normalizeTriage(parsed: Record<string, unknown>): EmergencyTriageJson {
  const strategyRaw = String(parsed.strategy ?? 'hold').toLowerCase()
  const strategy: EmergencyTriageStrategy =
    strategyRaw === 'pivot' || strategyRaw === 'drop' ? strategyRaw : 'hold'
  const oneSafeStep = String(parsed.oneSafeStep ?? parsed.one_safe_step ?? '').trim()
  const encouragement = String(parsed.encouragement ?? '').trim()
  let paused: string[] = []
  const pm = parsed.pausedNeedleMovers ?? parsed.paused_needle_movers
  if (Array.isArray(pm)) {
    paused = pm.map((x) => String(x).trim()).filter(Boolean)
  }
  const breathing =
    typeof parsed.breathingPrompt === 'string'
      ? parsed.breathingPrompt.trim()
      : typeof parsed.breathing_prompt === 'string'
        ? parsed.breathing_prompt.trim()
        : undefined

  return {
    strategy,
    oneSafeStep: oneSafeStep || 'Take 60 seconds to name the single next physical action.',
    pausedNeedleMovers: paused,
    encouragement: encouragement || 'You can handle the next step only—nothing else is required right now.',
    breathingPrompt: breathing || undefined,
  }
}

/**
 * Server-only: strategic triage for a Hot emergency vs today’s morning tasks.
 */
export async function generateEmergencyTriage(
  userId: string,
  fireDescription: string,
  planDate: string
): Promise<EmergencyTriageJson> {
  const tasks = await loadMorningTasksForTriage(userId, planDate)
  const taskLines = tasks
    .map((t, i) => {
      const tag =
        t.needleMover === true ? ' (marked Needle Mover)' : t.needleMover === false ? ' (not Needle Mover)' : ''
      return `${i + 1}. ${t.description}${tag}`
    })
    .join('\n')

  const systemPrompt =
    MRS_DEER_RULES +
    `\n\nYou are Mrs. Deer in EMERGENCY TRIAGE mode. Output ONE JSON object only — no markdown, no prose outside JSON.

Schema:
{
  "strategy": "hold" | "pivot" | "drop",
  "oneSafeStep": "string — one concrete action they can finish in ~10 minutes",
  "pausedNeedleMovers": ["exact task titles from the list that should pause"],
  "encouragement": "one short calming sentence",
  "breathingPrompt": "optional 10-second breathing instruction"
}

Rules:
- Compare the fire to their morning tasks. Choose hold (pause planned work), pivot (replace priority), or drop (defer a task) realistically.
- pausedNeedleMovers MUST use wording from the provided task list when possible (substring or exact title).
- oneSafeStep must be tactical and immediate — not a lecture.
- Keep encouragement under 220 characters.`

  const userPrompt = `FIRE (founder wrote):\n${fireDescription}\n\nTODAY'S MORNING TASKS (same calendar day ${planDate}):\n${taskLines || '(no tasks logged yet for this day)'}\n\nReturn JSON only.`

  const raw = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    maxTokens: 500,
    temperature: 0.35,
  })

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>
  } catch {
    return normalizeTriage({
      strategy: 'hold',
      oneSafeStep: 'Step away from your plan for two minutes. Name one person or system who can help with the fire.',
      pausedNeedleMovers: tasks.slice(0, 2).map((t) => t.description),
      encouragement: 'This is a lot—and you only need the next small move.',
      breathingPrompt: 'Inhale 4 counts, exhale 6 counts. Twice.',
    })
  }

  return normalizeTriage(parsed)
}
