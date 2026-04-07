import { format, subDays } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import { generateAIPrompt, PRO_MORNING_MODEL_CANDIDATES } from '@/lib/ai-client'
import {
  generateProDecisionStrategies,
  type EveningBridgeForStrategies,
} from '@/lib/morning/generate-pro-decision-strategies'
import {
  type ActionPlanMatrixKey,
  parseAISuggestedActionTypeToMatrixKey,
  proActionMatrixManifestoForGhostwriterPrompt,
  proGhostwriterMatrixInstruction,
} from '@/lib/morning/pro-action-matrix'
import { getStrategicMemory } from '@/lib/morning/strategic-memory-server'
import { sanitizeAiJsonText, stripDailyPivotMirrorFromWhy } from '@/lib/morning/sanitize-ai-json-text'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Action = 'SUGGEST_DECISION' | 'GHOSTWRITE_METADATA' | 'SUGGEST_TASKS'

function parseWhyHowOnly(raw: string): { why: string; how: string; onlyICanDo: string } {
  const t = raw.replace(/\s+/g, ' ').trim()
  const whyM = t.match(/WHY:\s*(.+?)(?=\s*\|\s*HOW:|\s*$)/i)
  const howM = t.match(/HOW:\s*(.+?)(?=\s*\|\s*ONLY:|\s*$)/i)
  const onlyM = t.match(/ONLY:\s*(.+)$/i)
  return {
    why: whyM?.[1]?.trim() ?? '',
    how: howM?.[1]?.trim() ?? '',
    onlyICanDo: onlyM?.[1]?.trim() ?? '',
  }
}

function parseTaskLines(raw: string, count: 2 | 3): string[] {
  const trimmed = sanitizeAiJsonText(raw).trim()
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return (parsed as string[])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, count)
    }
  } catch {
    /* fall through */
  }
  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.replace(/^\s*\d+[\).\s]+/, '').trim())
    .filter(Boolean)
  return lines.slice(0, count)
}

type ParsedTaskSuggestion = { task: string; actionPlan: ActionPlanMatrixKey; actionTypeWhy: string }

function parseTaskSuggestionActionPlan(rawType: unknown): ActionPlanMatrixKey {
  if (typeof rawType !== 'string' || !rawType.trim()) return 'my_zone'
  const t = rawType.trim()
  return (GHOSTWRITE_ACTION_PLANS as readonly string[]).includes(t)
    ? (t as ActionPlanMatrixKey)
    : parseAISuggestedActionTypeToMatrixKey(t)
}

/** JSON array of { task, action_type, action_type_why } or legacy string array / newline list. */
function parseTaskSuggestions(raw: string, count: 2 | 3): ParsedTaskSuggestion[] {
  const trimmed = sanitizeAiJsonText(raw).trim()
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) {
      const out: ParsedTaskSuggestion[] = []
      for (const item of parsed) {
        if (typeof item === 'string') {
          const task = item.trim()
          if (task) out.push({ task, actionPlan: 'my_zone', actionTypeWhy: '' })
        } else if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          const taskStr =
            typeof o.task === 'string'
              ? o.task.trim()
              : typeof o.title === 'string'
                ? o.title.trim()
                : ''
          if (!taskStr) continue
          const rawType = o.action_type ?? o.actionType ?? o.recommended_action ?? o.recommendedAction
          const whyRaw = o.action_type_why ?? o.actionTypeWhy
          out.push({
            task: taskStr,
            actionPlan: parseTaskSuggestionActionPlan(rawType),
            actionTypeWhy: typeof whyRaw === 'string' ? whyRaw.trim() : '',
          })
        }
        if (out.length >= count) break
      }
      if (out.length >= count) return out.slice(0, count)
    }
  } catch {
    /* fall through */
  }
  const lines = parseTaskLines(trimmed, count)
  return lines.map((task) => ({ task, actionPlan: 'my_zone' as ActionPlanMatrixKey, actionTypeWhy: '' }))
}

function optScale15(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round(v)
  if (n < 1 || n > 5) return null
  return n
}

const GHOSTWRITE_ACTION_PLANS: readonly ActionPlanMatrixKey[] = [
  'my_zone',
  'systemize',
  'delegate_founder',
  'eliminate_founder',
  'quick_win_founder',
] as const

function parseGhostwriteActionPlan(v: unknown): ActionPlanMatrixKey {
  if (typeof v !== 'string') return 'my_zone'
  const t = v.trim()
  return (GHOSTWRITE_ACTION_PLANS as readonly string[]).includes(t)
    ? (t as ActionPlanMatrixKey)
    : parseAISuggestedActionTypeToMatrixKey(t)
}

function parseEveningBridgeFromBody(raw: unknown): EveningBridgeForStrategies | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const reviewDate =
    typeof o.reviewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.reviewDate) ? o.reviewDate : null
  if (!reviewDate) return null
  const wins = Array.isArray(o.wins) ? o.wins.filter((x): x is string => typeof x === 'string') : []
  const lessons = Array.isArray(o.lessons) ? o.lessons.filter((x): x is string => typeof x === 'string') : []
  const journal = typeof o.journal === 'string' ? o.journal : null
  return {
    reviewDate,
    mood: optScale15(o.mood),
    energy: optScale15(o.energy),
    wins,
    lessons,
    journal,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profileRow, error: profileError } = await db
      .from('user_profiles')
      .select(
        'tier, created_at, quarterly_intention, primary_goal_text, current_streak, longest_streak, coach_preferences'
      )
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[pro-morning] profile', profileError)
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

    let body: {
      action?: Action
      planDate?: string
      taskName?: string
      decision?: string
      count?: number
      eveningBridge?: unknown
      actionPlan?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const action = body.action
    if (action !== 'SUGGEST_DECISION' && action !== 'GHOSTWRITE_METADATA' && action !== 'SUGGEST_TASKS') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const row = (profileRow ?? null) as {
      current_streak?: number | null
      quarterly_intention?: string | null
      primary_goal_text?: string | null
    } | null
    const streakDays = Math.max(0, Number(row?.current_streak ?? 0))
    const quarterlyIntention = (row?.quarterly_intention ?? '').trim()
    const primaryGoal = (row?.primary_goal_text ?? '').trim()

    const aiOpts = {
      models: PRO_MORNING_MODEL_CANDIDATES,
      temperature: 0.65,
    } as const

    if (action === 'SUGGEST_DECISION') {
      const planDate =
        typeof body.planDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.planDate) ? body.planDate : null
      if (!planDate) {
        return NextResponse.json({ error: 'planDate (YYYY-MM-DD) required' }, { status: 400 })
      }

      const bridge = parseEveningBridgeFromBody(body.eveningBridge)
      const strategies = await generateProDecisionStrategies(db, session.user.id, planDate, bridge)

      return NextResponse.json({ strategies })
    }

    if (action === 'GHOSTWRITE_METADATA') {
      const taskName = typeof body.taskName === 'string' ? body.taskName.trim() : ''
      const decision = typeof body.decision === 'string' ? body.decision.trim() : ''
      if (!taskName || !decision) {
        return NextResponse.json({ error: 'taskName and decision required' }, { status: 400 })
      }

      const actionPlan = parseGhostwriteActionPlan(body.actionPlan)
      const matrixBlock = proGhostwriterMatrixInstruction(actionPlan)
      const manifesto = proActionMatrixManifestoForGhostwriterPrompt()

      let memoryBlock = ''
      try {
        memoryBlock = await getStrategicMemory(db, session.user.id, taskName)
      } catch (memErr) {
        console.warn('[pro-morning] strategic memory', memErr)
      }

      const prefsRaw = (profileRow as { coach_preferences?: unknown } | null)?.coach_preferences
      const prefs =
        prefsRaw && typeof prefsRaw === 'object' && !Array.isArray(prefsRaw)
          ? (prefsRaw as Record<string, unknown>)
          : {}
      const toneCalibration =
        typeof prefs.tone_calibration_note === 'string' ? prefs.tone_calibration_note.trim().slice(0, 800) : ''
      const calibrationBlock =
        toneCalibration.length > 0
          ? `\nUser tone calibration from Plan Review (apply to voice: brevity, domain focus, etc.; do not quote or paste this literally into WHY/HOW/ONLY): ${toneCalibration.replace(/\s+/g, ' ')}\n`
          : ''

      const systemPrompt = `You are Mrs. Deer, a systems-thinking coach (not generic productivity advice). Reply with a single line in this exact format (including labels and pipes, no markdown):
WHY: <Strategic rationale: ONE punchy sentence (max 15 words) — how THIS specific task supports the daily pivot. Do NOT repeat or quote the pivot text; imply the link. Focus functional benefit (e.g. clears afternoon for deep work; validates pricing before you build; unblocks the launch path). FORBIDDEN: the exact template "Moves [X] forward by making [Y] real today." or any close variant ("moves … forward by making … real").> | HOW: <one sentence — must obey STRICT ACTION MATRIX + SELECTED TYPE below> | ONLY: <one sentence — same; label must be ONLY:>`

      const userPrompt = `Daily decision (context only — never paste into WHY): "${decision}"
Task name: "${taskName}"

${manifesto}

${matrixBlock}
${memoryBlock ? `\n${memoryBlock}\n` : ''}${calibrationBlock}
WHY = mentor voice, task-specific, zero redundancy with the decision string above. Keep each clause one sentence. Plain text only.`

      const raw = await generateAIPrompt({
        ...aiOpts,
        systemPrompt,
        userPrompt,
        maxTokens: 200,
      })

      const parsed = parseWhyHowOnly(raw)
      let whyOut = (parsed.why || raw.slice(0, 200)).trim()
      if (/moves\s+.+\s+forward\s+by\s+making/i.test(whyOut)) {
        whyOut = ''
      } else if (whyOut) {
        whyOut = stripDailyPivotMirrorFromWhy(whyOut, decision)
      }
      return NextResponse.json({
        why: whyOut,
        how: parsed.how || 'Block focused time and ship a small visible version.',
        onlyICanDo: parsed.onlyICanDo || 'Your judgment on scope and quality is still the bottleneck.',
      })
    }

    if (action === 'SUGGEST_TASKS') {
      const decision = typeof body.decision === 'string' ? body.decision.trim() : ''
      if (!decision) {
        return NextResponse.json({ error: 'decision required' }, { status: 400 })
      }
      const count = body.count === 2 ? 2 : 3

      const sinceIso = `${format(subDays(new Date(), 14), 'yyyy-MM-dd')}T00:00:00.000Z`
      const { count: postCount } = await db
        .from('task_postponements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('moved_at', sinceIso)
      const postponementsLast14 = postCount ?? 0

      const systemPrompt = `You are Mrs. Deer. The user needs ${count} concrete, high-leverage tasks for TODAY — not busywork.
Return ONLY a raw JSON array of exactly ${count} objects. No Markdown, no code fences (never \`\`\`json), no preamble, no postscript. The first character of your reply must be "[" and the last must be "]".
Each object must use snake_case keys: "task" (one-line actionable title), "recommended_action" OR "action_type" (same meaning; one key per object — exactly one of: milestone, systemize, delegate, let_go, quick_win), "action_type_why" (one short sentence: why that leadership mode fits THIS task—stay plausible; use postponement count below when relevant).
You may use "title" instead of "task" if you prefer — same meaning.`

      const userPrompt = `They decided today to: "${decision}"

Quarterly intention: ${quarterlyIntention || '(not set)'}
Primary goal: ${primaryGoal || '(not set)'}
Streak: ${streakDays} days of showing up.
Task postponements (last 14 days, app-wide count): ${postponementsLast14}.

RECOMMENDED_ACTION rules (strict schema):
- Quick win = only if the task is clearly completable in under 30 minutes with low cognitive load. NEVER use quick_win for substantial research, analysis, or deep drafting — use milestone or systemize instead.
- Milestone = high-leverage deep work the founder must own (often 60–120+ min blocks).
- Systemize = recurring ops / build template, SOP, or checklist so it is not hero work next time.
- Delegate = another person should execute; founder supplies brief or handoff.
- Let go = busy-work or safe to drop / defer honestly.
- If postponements are 3+: favor let_go or a true quick_win slice (not fake “quick” multi-hour work) when the task sounds stuck or heavy.

Return exactly ${count} objects. Vary recommended_action across suggestions when it genuinely fits — not all the same by default.`

      const raw = await generateAIPrompt({
        ...aiOpts,
        systemPrompt,
        userPrompt,
        maxTokens: 480,
      })

      let rows = parseTaskSuggestions(raw, count)
      let pad = 0
      while (rows.length < count && pad < count) {
        rows.push({
          task: `Follow through on: ${decision.slice(0, 60)}${decision.length > 60 ? '…' : ''} (${pad + 1})`,
          actionPlan: 'my_zone',
          actionTypeWhy: 'Defaulting to your milestone zone for this slot.',
        })
        pad += 1
      }
      rows = rows.slice(0, count)
      return NextResponse.json({
        tasks: rows.map((r) => r.task),
        taskSuggestions: rows.map((r) => ({
          task: r.task,
          actionPlan: r.actionPlan,
          actionTypeWhy: r.actionTypeWhy,
        })),
      })
    }

    return NextResponse.json({ error: 'Unsupported' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI error'
    console.error('[pro-morning]', e)
    if (msg.includes('OPENROUTER') || msg.includes('API key')) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
