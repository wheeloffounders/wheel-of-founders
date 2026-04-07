import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import { generateAIPrompt, PRO_MORNING_MODEL_CANDIDATES } from '@/lib/ai-client'
import {
  type ActionPlanMatrixKey,
  isActionPlanMatrixKey,
  parseAISuggestedActionTypeToMatrixKey,
  proActionMatrixManifestoForGhostwriterPrompt,
} from '@/lib/morning/pro-action-matrix'
import { sanitizeAiJsonText } from '@/lib/morning/sanitize-ai-json-text'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MATRIX_KEYS_LINE =
  'my_zone (Milestone), systemize (Systemize), delegate_founder (Delegate), eliminate_founder (Let go), quick_win_founder (Quick win)'

function parseMatrix(raw: unknown): ActionPlanMatrixKey {
  if (typeof raw !== 'string' || !raw.trim()) return 'my_zone'
  const t = raw.trim()
  if (isActionPlanMatrixKey(t)) return t
  return parseAISuggestedActionTypeToMatrixKey(t)
}

function parseOptionalDecision(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t || t.toLowerCase() === 'null') return null
  // Real pivots are usually a full clause; ultra-short strings are often noise.
  if (t.length < 12) return null
  return t.slice(0, 600)
}

/** Needle mover / primary focus — maps client-side to Daily pivot (`morning_decisions.decision` / `decision_json`). */
function parseCoreObjective(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t || t.toLowerCase() === 'null') return null
  if (t.length < 8) return null
  return t.slice(0, 600)
}

function parseBrainDumpJson(
  raw: string,
  maxTasks: number
): {
  tasks: { title: string; actionPlan: ActionPlanMatrixKey }[]
  overflow: string[]
  decision: string | null
  core_objective: string | null
} {
  const trimmed = sanitizeAiJsonText(raw).trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { tasks: [], overflow: [], decision: null, core_objective: null }
  }
  if (!parsed || typeof parsed !== 'object')
    return { tasks: [], overflow: [], decision: null, core_objective: null }
  const o = parsed as Record<string, unknown>
  const taskArr = Array.isArray(o.tasks) ? o.tasks : []
  const tasks: { title: string; actionPlan: ActionPlanMatrixKey }[] = []
  for (const item of taskArr) {
    if (tasks.length >= maxTasks) break
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title =
      typeof row.title === 'string'
        ? row.title.trim()
        : typeof row.task === 'string'
          ? row.task.trim()
          : ''
    if (title.length < 3) continue
    const actionPlan = parseMatrix(row.action_plan ?? row.actionPlan ?? row.action_type ?? row.matrix)
    tasks.push({
      title: title.slice(0, 280),
      actionPlan,
    })
  }

  const overflow: string[] = []
  const ov = o.overflow
  if (Array.isArray(ov)) {
    for (const x of ov) {
      if (typeof x === 'string' && x.trim()) overflow.push(x.trim().slice(0, 280))
    }
  }
  const extras = o.extra_items ?? o.extras
  if (Array.isArray(extras)) {
    for (const x of extras) {
      if (typeof x === 'string' && x.trim()) overflow.push(x.trim().slice(0, 280))
    }
  }

  const decision = parseOptionalDecision(o.decision ?? o.strategic_decision ?? o.strategicDecision)
  const core_objective = parseCoreObjective(o.core_objective ?? o.coreObjective)

  return { tasks, overflow, decision, core_objective }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profileRow, error: profileError } = await db
      .from('user_profiles')
      .select('tier, created_at')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[morning-brain-dump] profile', profileError)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    const tierInput = profileRow as TierProfileInput | null
    const devBypass = process.env.NODE_ENV === 'development'
    if (getEffectiveUserTier(tierInput) !== 'pro' && !devBypass) {
      return NextResponse.json(
        { error: 'Pro morning AI requires Pro or trial access' },
        { status: 403 }
      )
    }

    let body: { transcript?: string; decision?: string; maxTasks?: number }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
    if (transcript.length < 8) {
      return NextResponse.json({ error: 'Transcript too short' }, { status: 400 })
    }

    const decision = typeof body.decision === 'string' ? body.decision.trim() : ''
    const maxTasks: 2 | 3 = body.maxTasks === 2 ? 2 : 3

    const manifesto = proActionMatrixManifestoForGhostwriterPrompt()

    const systemPrompt = `You are Mrs. Deer, the founder's chief of staff (Chief of Staff protocol). You receive a messy spoken "brain dump" and must return ONLY a raw JSON object — no Markdown, no code fences (never \`\`\`json), no preamble, no postscript or explanation. The first character of your reply must be "{" and the last must be "}".

Schema:
{
  "core_objective": string | null,
  "tasks": [ ... 0 to ${maxTasks} objects ... ],
  "overflow": [ "strings" ],
  "decision": string | null
}

**Core objective (the sun — maps to the founder's Daily pivot / needle mover, NOT a task row):**
- "core_objective": The single clearest **primary focus or outcome for TODAY** if the speaker names one (e.g. "Ship the Q3 strategy narrative", "Close the enterprise pilot decision"). This is the **orbiting center** — not a bulleted chore.
- If they only list tasks and never state a unifying focus, set "core_objective" to null. Do NOT duplicate a task title inside "core_objective".

Each object in "tasks" (tactical actions, separate from core objective):
- "title": string — one clean, professional task line (no "um", "like", "maybe", "I guess"; concise; founder-facing)
- "action_plan": one of: ${MATRIX_KEYS_LINE}

Tasks rules (AUGMENT, not busywork):
- Output **up to ${maxTasks}** tasks — fewer is fine if the dump is thin or mostly emotional noise.
- Pick the most strategic, high-leverage **actions for TODAY** (not busywork). Order by impact: first task = highest leverage.
- If the speaker mentioned more than ${maxTasks} distinct task-sized actions, put the rest in "overflow" (short labels). Never drop content silently — extras belong in "overflow".
- **Worries / anxiety / risks** that are not concrete to-dos belong in "overflow", prefixed with \`Potential friction: \` when helpful.
- "action_plan" must match the leadership mode: deep founder-owned work → my_zone; templates/SOPs → systemize; someone else should do → delegate_founder; drop/defer → eliminate_founder; under-30-minute slice → quick_win_founder.

**"decision" (optional, secondary framing):** mindset or strategic *framing* that is NOT the core objective and NOT a task (e.g. "Protect deep work before noon"). Use null if redundant with core_objective or absent.

${manifesto}`

    const userPrompt = `Existing Daily pivot / core focus in the app (may be empty; augment — do not erase unless the dump clearly replaces it): ${decision || '(not set yet)'}

Brain dump transcript:
"""
${transcript.slice(0, 12000)}
"""

Output only the JSON object. Use null for missing fields. "tasks" may be an empty array if nothing new and actionable was said.`

    const raw = await generateAIPrompt({
      models: PRO_MORNING_MODEL_CANDIDATES,
      temperature: 0.45,
      systemPrompt,
      userPrompt,
      maxTokens: 1600,
    })

    const parsed = parseBrainDumpJson(raw, maxTasks)

    return NextResponse.json(parsed)
  } catch (e) {
    console.error('[morning-brain-dump]', e)
    return NextResponse.json({ error: 'Brain dump processing failed' }, { status: 500 })
  }
}
