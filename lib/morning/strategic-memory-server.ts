import { format, subDays } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseProTaskRefinement } from '@/lib/morning/pro-task-refinement'
import {
  normalizeTaskTitleKey,
  taskTitlesSimilar,
  taskTitleWordJaccard,
} from '@/lib/morning/task-title-similarity'

export { normalizeTaskTitleKey } from '@/lib/morning/task-title-similarity'

type TaskRow = {
  description: string
  why_this_matters?: string | null
  action_plan?: string | null
  action_plan_note?: string | null
  plan_date?: string
  updated_at?: string
  user_refined?: boolean | null
}

const STRONG_TITLE_JACCARD = 0.8

/**
 * Loads strategic memory lines for ghostwriter (saved preference + similar past tasks).
 * Same as {@link buildStrategicMemoryPromptBlock}; use this name when wiring “getStrategicMemory”.
 */
export async function getStrategicMemory(
  db: SupabaseClient,
  userId: string,
  taskTitle: string
): Promise<string> {
  return buildStrategicMemoryPromptBlock(db, userId, taskTitle)
}

/**
 * Builds a block for the ghostwriter: saved Revise preference + up to 3 similar past refinements.
 * Prioritizes `user_refined` rows and boosts titles with ≥80% word Jaccard overlap.
 */
export async function buildStrategicMemoryPromptBlock(
  db: SupabaseClient,
  userId: string,
  taskTitle: string
): Promise<string> {
  const title = taskTitle.trim()
  if (!title) return ''

  const norm = normalizeTaskTitleKey(title)
  if (!norm) return ''

  const lines: string[] = []

  const { data: pref, error: prefErr } = await db
    .from('user_strategic_preferences')
    .select('preference_text, task_title_snapshot, updated_at')
    .eq('user_id', userId)
    .eq('task_title_normalized', norm)
    .maybeSingle()

  const prefRow = !prefErr ? (pref as { preference_text?: string; task_title_snapshot?: string } | null) : null
  if (prefRow?.preference_text?.trim()) {
    lines.push(
      `The user previously refined this kind of work with these instructions (saved): "${prefRow.preference_text.trim().slice(0, 900)}" — prioritize this approach when it fits the matrix and today's decision.`
    )
  }

  const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const { data: rawRows, error } = await (db.from('morning_tasks') as any)
    .select(
      'description, why_this_matters, action_plan, action_plan_note, plan_date, updated_at, user_refined'
    )
    .eq('user_id', userId)
    .gte('plan_date', since)
    .not('description', 'eq', '')
    .order('updated_at', { ascending: false })
    .limit(150)

  if (error) {
    console.warn('[strategic-memory] morning_tasks query', error.message)
  }

  const rows = (rawRows ?? []) as TaskRow[]

  let strongLine = ''
  for (const r of rows) {
    if (!r.user_refined) continue
    if (!taskTitlesSimilar(r.description, title)) continue
    const j = taskTitleWordJaccard(r.description, title)
    if (j < STRONG_TITLE_JACCARD) continue
    const { how } = parseProTaskRefinement(r.action_plan_note)
    if (how.trim().length < 14) continue
    strongLine = `Strong title match (~${Math.round(j * 100)}% overlap) with a task you already refined: "${r.description.slice(0, 120)}" — your refined HOW was: ${how.slice(0, 420)}`
    break
  }
  if (strongLine) {
    lines.push(`• ${strongLine}`)
  }

  const candidates = rows.filter((r) => taskTitlesSimilar(r.description, title))
  const refinedFirst = [...candidates].sort((a, b) => {
    const ar = a.user_refined ? 1 : 0
    const br = b.user_refined ? 1 : 0
    if (br !== ar) return br - ar
    const ja = taskTitleWordJaccard(a.description, title)
    const jb = taskTitleWordJaccard(b.description, title)
    if (jb !== ja) return jb - ja
    return 0
  })

  const examples: string[] = []
  const seen = new Set<string>()

  for (const r of refinedFirst) {
    const { how } = parseProTaskRefinement(r.action_plan_note)
    if (how.trim().length < 14) continue
    const why = (r.why_this_matters ?? '').trim()
    const key = normalizeTaskTitleKey(r.description) + '|' + how.slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    const date = r.plan_date ?? ''
    const ap = r.action_plan ? ` [${r.action_plan}]` : ''
    const refinedTag = r.user_refined ? ' (user-refined) ' : ' '
    const bit = why
      ? `Task "${r.description.slice(0, 120)}"${ap} (${date})${refinedTag}— Why: ${why.slice(0, 160)} … How you refined: ${how.slice(0, 320)}`
      : `Task "${r.description.slice(0, 120)}"${ap} (${date})${refinedTag}— How you refined: ${how.slice(0, 380)}`
    examples.push(`• ${bit}`)
    if (examples.length >= 3) break
  }

  lines.push(...examples)

  if (lines.length === 0) return ''

  return `STRATEGIC MEMORY (this founder only — treat as primary reference; still obey the ACTION MATRIX for the selected type):
${lines.join('\n')}

The user previously refined similar tasks with the lines above. Prioritize that approach when it fits today's decision and matrix. If relevant, open with a brief nod (e.g. "Following how you've shaped this before…") then execute. Do not copy verbatim if it conflicts with the matrix.`
}
