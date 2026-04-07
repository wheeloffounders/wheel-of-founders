import type { ActionPlanMatrixKey } from '@/lib/morning/pro-action-matrix'
import {
  isActionPlanMatrixKey,
  parseAISuggestedActionTypeToMatrixKey,
} from '@/lib/morning/pro-action-matrix'
import { proMorningAiPost, ProMorningAIError } from '@/lib/morning/pro-morning-api'
import { sanitizeAiCardLabelText, stripDailyPivotMirrorFromWhy } from '@/lib/morning/sanitize-ai-json-text'

/** One line from Mrs. Deer’s task tray; optional leadership-layer hint. */
export type ProSuggestedTask = {
  text: string
  suggestedActionPlan?: ActionPlanMatrixKey
  actionTypeWhy?: string
}

export type ProGhostMeta = {
  why: string
  how: string
  onlyICanDo: string
}

function ghostwriteFallback(
  taskName: string,
  _decision: string,
  actionPlan: ActionPlanMatrixKey | '' = 'my_zone'
): ProGhostMeta {
  const t = taskName.trim() || 'this focus'
  const shortT = t.length > 56 ? `${t.slice(0, 53)}…` : t
  const p = actionPlan || 'my_zone'
  /** Punchy bridge lines — no repeated pivot quotes, no “Moves X forward by making Y real.” */
  const whyByPlan: Record<ActionPlanMatrixKey, string> = {
    my_zone: `This is where your judgment and deep focus earn the compound return—not busywork.`,
    delegate_founder: `Handing "${shortT}" to the right owner keeps your CEO band for calls only you can make.`,
    systemize: `Turning "${shortT}" into a repeatable slice means you do not hero it every week.`,
    eliminate_founder: `Cutting or parking "${shortT}" buys back oxygen for what actually ships today.`,
    quick_win_founder: `A tight win on "${shortT}" builds momentum without eating your milestone block.`,
  }

  if (p === 'delegate_founder') {
    return {
      why: whyByPlan.delegate_founder,
      how: `Draft a tight brief: outcome, deadline, and one example so someone else can run with it.`,
      onlyICanDo: `Name the best owner and what they need from you—then get out of the way.`,
    }
  }
  if (p === 'systemize') {
    return {
      why: whyByPlan.systemize,
      how: `Write the checklist or template so the next time this comes up it takes half the effort.`,
      onlyICanDo: `The one repeatable step you document today becomes tomorrow’s shortcut.`,
    }
  }
  if (p === 'eliminate_founder') {
    return {
      why: whyByPlan.eliminate_founder,
      how: `Name what you’d stop doing if this slipped—and whether anyone truly depends on it.`,
      onlyICanDo: `If no one misses it by Friday, you’ve bought back real focus.`,
    }
  }
  if (p === 'quick_win_founder') {
    return {
      why: whyByPlan.quick_win_founder,
      how: `Do the smallest visible slice in one short block—ship, then iterate.`,
      onlyICanDo: `The next 15-minute micro-step you can do before you leave this screen.`,
    }
  }
  return {
    why: whyByPlan.my_zone,
    how: `Block 45–60 minutes, one tab, ship a v1 you can iterate on.`,
    onlyICanDo: `The tradeoff on scope and quality still needs your call.`,
  }
}

/** Server-side Mrs. Deer ghostwriter (`/api/ai/pro-morning`); falls back locally on error or 403. */
export async function generateMetadata(
  taskName: string,
  decision: string,
  actionPlan: ActionPlanMatrixKey | '' = 'my_zone'
): Promise<ProGhostMeta> {
  const name = taskName.trim()
  const dec = decision.trim()
  const plan = actionPlan || 'my_zone'
  if (!name || !dec) {
    return ghostwriteFallback(name, dec, plan)
  }
  try {
    const data = await proMorningAiPost<ProGhostMeta>({
      action: 'GHOSTWRITE_METADATA',
      taskName: name,
      decision: dec,
      actionPlan: plan,
    })
    const fb = ghostwriteFallback(name, dec, plan)
    let why = data.why?.trim() || fb.why
    if (/moves\s+.+\s+forward\s+by\s+making/i.test(why)) {
      why = fb.why
    } else {
      why = stripDailyPivotMirrorFromWhy(why, dec)
      if (!why.trim()) why = fb.why
    }
    return {
      why,
      how: data.how?.trim() || fb.how,
      onlyICanDo: data.onlyICanDo?.trim() || fb.onlyICanDo,
    }
  } catch (e) {
    if (e instanceof ProMorningAIError && e.status === 403) {
      return ghostwriteFallback(name, dec, plan)
    }
    console.warn('[generateMetadata] AI failed, using fallback', e)
    return ghostwriteFallback(name, dec, plan)
  }
}

function suggestTasksLocal(decision: string, count: 3 | 2): ProSuggestedTask[] {
  const core = decision.trim() || 'your top outcome for today'
  const lead = core.length > 90 ? `${core.slice(0, 87)}…` : core
  const three: ProSuggestedTask[] = [
    { text: `Define the smallest “done” for: ${lead}` },
    { text: `Protect one deep-work block to execute the critical path` },
    { text: `Close the loop: one message or decision that unblocks others` },
  ]
  const two: ProSuggestedTask[] = [
    { text: `Ship one tangible step on: ${lead}` },
    { text: `Protect focus time to finish the core thread` },
  ]
  return count === 2 ? two : three
}

function normalizeTaskSuggestionsFromApi(
  data: { tasks?: string[]; taskSuggestions?: unknown },
  count: 2 | 3
): ProSuggestedTask[] {
  const ts = data.taskSuggestions
  if (Array.isArray(ts) && ts.length > 0) {
    return ts
      .slice(0, count)
      .map((row) => {
        const o = row as Record<string, unknown>
        const rawText =
          typeof o.task === 'string'
            ? o.task.trim()
            : typeof o.text === 'string'
              ? o.text.trim()
              : ''
        const text = rawText ? sanitizeAiCardLabelText(rawText) || rawText : ''
        const ap = o.actionPlan ?? o.action_plan ?? o.recommended_action ?? o.recommendedAction
        let suggestedActionPlan: ActionPlanMatrixKey | undefined
        if (typeof ap === 'string' && ap.trim()) {
          const t = ap.trim()
          suggestedActionPlan = isActionPlanMatrixKey(t) ? t : parseAISuggestedActionTypeToMatrixKey(t)
        }
        const whyRaw = o.actionTypeWhy ?? o.action_type_why
        const whyStr = typeof whyRaw === 'string' && whyRaw.trim() ? whyRaw.trim() : ''
        const actionTypeWhy = whyStr
          ? sanitizeAiCardLabelText(whyStr) || whyStr
          : undefined
        const out: ProSuggestedTask = { text }
        if (suggestedActionPlan) out.suggestedActionPlan = suggestedActionPlan
        if (actionTypeWhy) out.actionTypeWhy = actionTypeWhy
        return out
      })
      .filter((x) => x.text)
  }
  const arr = Array.isArray(data.tasks) ? data.tasks : []
  return arr
    .slice(0, count)
    .map((s) => {
      const raw = String(s).trim()
      const text = raw ? sanitizeAiCardLabelText(raw) || raw : ''
      return { text }
    })
    .filter((x) => x.text)
}

/** Server-side task suggestions; falls back to local templates on error or 403. */
export async function suggestThreeTasksFromDecision(
  decision: string,
  count: 3 | 2
): Promise<ProSuggestedTask[]> {
  const dec = decision.trim()
  if (!dec) return suggestTasksLocal(decision, count)
  try {
    const data = await proMorningAiPost<{ tasks: string[]; taskSuggestions?: unknown }>({
      action: 'SUGGEST_TASKS',
      decision: dec,
      count,
    })
    const normalized = normalizeTaskSuggestionsFromApi(data, count)
    if (normalized.length >= count) return normalized.slice(0, count)
    const merged = [...normalized]
    for (const line of suggestTasksLocal(decision, count)) {
      if (merged.length >= count) break
      if (!merged.some((m) => m.text === line.text)) merged.push(line)
    }
    return merged.slice(0, count)
  } catch (e) {
    if (e instanceof ProMorningAIError && e.status === 403) {
      return suggestTasksLocal(decision, count)
    }
    console.warn('[suggestThreeTasksFromDecision] AI failed, using fallback', e)
    return suggestTasksLocal(decision, count)
  }
}
