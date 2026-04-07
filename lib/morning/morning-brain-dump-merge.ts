import type { Task } from '@/app/morning/page'
import type { BrainDumpTask } from '@/lib/morning/process-morning-brain-dump'
import { sanitizeAiCardLabelText } from '@/lib/morning/sanitize-ai-json-text'
import { taskTitlesSimilar } from '@/lib/morning/task-title-similarity'
import type { ActionPlanMatrixKey } from '@/lib/morning/pro-action-matrix'

/** Count non-empty priority rows in the base stream (Rule of 3 / 2). */
export function countFilledBaseSlots(tasks: Task[], baseStreamSlots: number): number {
  return tasks.slice(0, baseStreamSlots).filter((t) => t.description.trim()).length
}

/** New brain-dump tasks that are not already represented in existing rows (by title similarity). */
export function filterUniqueNewTasks(existing: Task[], incoming: BrainDumpTask[]): BrainDumpTask[] {
  const existingTitles = existing.map((t) => t.description.trim()).filter(Boolean)
  const out: BrainDumpTask[] = []
  for (const row of incoming) {
    const title = row.title.trim()
    if (title.length < 3) continue
    const dup = existingTitles.some((ex) => taskTitlesSimilar(ex, title))
    if (dup) continue
    const dupNew = out.some((o) => taskTitlesSimilar(o.title, title))
    if (dupNew) continue
    out.push(row)
  }
  return out
}

/** Append overflow lines; skip exact duplicates. */
export function appendOverflowLines(prev: string[] | null, lines: string[]): string[] {
  const base = prev ?? []
  const seen = new Set(base.map((s) => s.trim().toLowerCase()))
  const add: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    add.push(t)
  }
  return [...base, ...add]
}

/** Merge Core Objective / Daily pivot text — augment, don’t blindly replace. */
export function mergeCoreObjectiveText(existing: string, incoming: string | null | undefined): string | null {
  if (!incoming?.trim()) return null
  const inc = sanitizeAiCardLabelText(incoming.trim()) || incoming.trim()
  if (inc.length < 8) return null
  const ex = existing.trim()
  if (!ex) return inc
  if (taskTitlesSimilar(ex, inc) || ex === inc) return null
  if (ex.includes(inc) || inc.includes(ex)) return null
  return `${ex}\n\n${inc}`
}

export function sanitizeOverflowLine(line: string): string {
  const x = sanitizeAiCardLabelText(line)
  return x || line.trim()
}

export type GhostwriterSlot = { index: number; title: string; actionPlan: ActionPlanMatrixKey }

type NewTaskRow = () => Task

/**
 * Fill empty priority rows in order (0 … maxStreamSlots − 1). Anything past capacity goes to overflow.
 * `needExtraSlots` is true when any slot at or beyond the Rule-of-3 base (`baseStreamSlots`) was filled.
 */
export function mergeNewTasksIntoRows(
  existing: Task[],
  uniqueNew: BrainDumpTask[],
  baseStreamSlots: number,
  maxStreamSlots: number,
  newTaskRow: NewTaskRow
): { nextTasks: Task[]; ghostRows: GhostwriterSlot[]; overflowTitles: string[]; needExtraSlots: boolean } {
  const next = [...existing]
  while (next.length < maxStreamSlots) next.push(newTaskRow())
  const remaining = [...uniqueNew]
  const ghostRows: GhostwriterSlot[] = []
  let needExtraSlots = false

  for (let i = 0; i < maxStreamSlots && remaining.length; i++) {
    const cur = next[i] ?? newTaskRow()
    if (!cur.description.trim()) {
      const got = remaining.shift()!
      const title = sanitizeAiCardLabelText(got.title.trim()) || got.title.trim()
      next[i] = { ...newTaskRow(), ...cur, description: title, actionPlan: got.actionPlan }
      ghostRows.push({ index: i, title, actionPlan: got.actionPlan })
      if (i >= baseStreamSlots) needExtraSlots = true
    }
  }

  const overflowTitles: string[] = []
  for (const r of remaining) {
    const t = sanitizeAiCardLabelText(r.title.trim()) || r.title.trim()
    if (t) overflowTitles.push(t)
  }

  return { nextTasks: next, ghostRows, overflowTitles, needExtraSlots }
}
