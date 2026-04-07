import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import { generateAIPrompt, PRO_MORNING_MODEL_CANDIDATES } from '@/lib/ai-client'
import { sanitizeAiJsonText } from '@/lib/morning/sanitize-ai-json-text'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_LEN = 8

type MorningTaskInput = { description: string; completed: boolean; needle_mover?: boolean }
type EmergencyInput = { description: string; severity: string; resolved: boolean }

function normalizeMorningTasks(raw: unknown): MorningTaskInput[] {
  if (!Array.isArray(raw)) return []
  const out: MorningTaskInput[] = []
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const desc = typeof o.description === 'string' ? o.description.trim() : ''
    if (!desc) continue
    out.push({
      description: desc.slice(0, 500),
      completed: Boolean(o.completed),
      needle_mover: typeof o.needle_mover === 'boolean' ? o.needle_mover : undefined,
    })
  }
  return out
}

function normalizeStringLines(raw: unknown, maxLines: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') continue
    const t = x.trim()
    if (!t) continue
    out.push(t.slice(0, maxLen))
    if (out.length >= maxLines) break
  }
  return out
}

function normalizeEmergencies(raw: unknown): EmergencyInput[] {
  if (!Array.isArray(raw)) return []
  const out: EmergencyInput[] = []
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const desc = typeof o.description === 'string' ? o.description.trim() : ''
    if (!desc) continue
    const sev = typeof o.severity === 'string' ? o.severity.trim().toLowerCase() : ''
    const severity = sev === 'hot' || sev === 'warm' || sev === 'contained' ? sev : 'warm'
    out.push({
      description: desc.slice(0, 500),
      severity,
      resolved: Boolean(o.resolved),
    })
  }
  return out
}

function parseSortJson(raw: string): {
  suggestedReflection: string
  suggestedWins: string[]
  suggestedLessons: string[]
} {
  const trimmed = sanitizeAiJsonText(raw).trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { suggestedReflection: '', suggestedWins: [], suggestedLessons: [] }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { suggestedReflection: '', suggestedWins: [], suggestedLessons: [] }
  }
  const o = parsed as Record<string, unknown>
  const reflection =
    typeof o.suggestedReflection === 'string'
      ? o.suggestedReflection.trim()
      : typeof o.reflection === 'string'
        ? o.reflection.trim()
        : typeof o.summary === 'string'
          ? o.summary.trim()
          : ''
  const winsRaw = o.suggestedWins ?? o.wins
  const lessonsRaw = o.suggestedLessons ?? o.lessons
  const wins: string[] = []
  if (Array.isArray(winsRaw)) {
    for (const x of winsRaw) {
      if (typeof x === 'string' && x.trim()) wins.push(x.trim().slice(0, 400))
      if (wins.length >= 8) break
    }
  }
  const lessons: string[] = []
  if (Array.isArray(lessonsRaw)) {
    for (const x of lessonsRaw) {
      if (typeof x === 'string' && x.trim()) lessons.push(x.trim().slice(0, 400))
      if (lessons.length >= 8) break
    }
  }
  return {
    suggestedReflection: reflection.slice(0, 4000),
    suggestedWins: wins,
    suggestedLessons: lessons,
  }
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
      console.error('[evening/sort-dump] profile', profileError)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    const tierInput = profileRow as TierProfileInput | null
    const devBypass = process.env.NODE_ENV === 'development'
    if (getEffectiveUserTier(tierInput) !== 'pro' && !devBypass) {
      return NextResponse.json(
        { error: 'Evening brain dump sorting requires Pro or trial access' },
        { status: 403 }
      )
    }

    let body: {
      brainDump?: string
      reviewDate?: unknown
      existingWins?: unknown
      existingLessons?: unknown
      morningTasks?: unknown
      todayEmergencies?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const brainDump = typeof body.brainDump === 'string' ? body.brainDump.trim() : ''
    if (brainDump.length < MIN_LEN) {
      return NextResponse.json({ error: 'Brain dump too short' }, { status: 400 })
    }

    const reviewDateRaw = typeof body.reviewDate === 'string' ? body.reviewDate.trim() : ''
    const reviewDate =
      /^\d{4}-\d{2}-\d{2}$/.test(reviewDateRaw) ? reviewDateRaw : null

    const morningTasksNorm = normalizeMorningTasks(body.morningTasks)
    const todayEmergenciesClient = normalizeEmergencies(body.todayEmergencies)
    const existingWinsNorm = normalizeStringLines(body.existingWins, 24, 450)
    const existingLessonsNorm = normalizeStringLines(body.existingLessons, 24, 450)

    type EmergencyLogRow = {
      id: string
      description: string
      severity: string
      resolved: boolean
      contained: boolean
    }

    let emergencyLogsForPrompt: EmergencyLogRow[] = []

    if (reviewDate) {
      const { data: emergencyRows, error: emergencyFetchError } = await db
        .from('emergencies')
        .select('id, description, severity, resolved, containment_plan_committed_at')
        .eq('user_id', session.user.id)
        .eq('fire_date', reviewDate)
        .order('created_at', { ascending: false })
        .limit(40)

      if (!emergencyFetchError && emergencyRows && emergencyRows.length > 0) {
        emergencyLogsForPrompt = emergencyRows.map((row) => {
          const r = row as Record<string, unknown>
          const desc = typeof r.description === 'string' ? r.description.trim() : ''
          const sevRaw = typeof r.severity === 'string' ? r.severity.trim().toLowerCase() : ''
          const severity = sevRaw === 'hot' || sevRaw === 'warm' || sevRaw === 'contained' ? sevRaw : 'warm'
          const resolved = Boolean(r.resolved)
          const containmentCommitted =
            r.containment_plan_committed_at != null && String(r.containment_plan_committed_at).length > 0
          return {
            id: typeof r.id === 'string' ? r.id : String(r.id ?? ''),
            description: desc.slice(0, 600),
            severity,
            resolved,
            contained: severity === 'contained' || containmentCommitted,
          }
        })
      }
    }

    if (emergencyLogsForPrompt.length === 0 && todayEmergenciesClient.length > 0) {
      emergencyLogsForPrompt = todayEmergenciesClient.map((e, i) => ({
        id: `client-${i}`,
        description: e.description,
        severity: e.severity,
        resolved: e.resolved,
        contained: e.severity === 'contained',
      }))
    }

    const includeContext =
      morningTasksNorm.length > 0 ||
      emergencyLogsForPrompt.length > 0 ||
      existingWinsNorm.length > 0 ||
      existingLessonsNorm.length > 0 ||
      body.morningTasks !== undefined ||
      body.todayEmergencies !== undefined ||
      body.existingWins !== undefined ||
      body.existingLessons !== undefined

    const emergencyBridgeInstructions =
      emergencyLogsForPrompt.length > 0
        ? `

## Emergency-to-win bridge (only for battle-scars — not routine tasks)
**ONLY** proactively inject lines from **Emergency logs** where \`resolved\` is true OR \`contained\` is true, using prefix **"Resolved Crisis: "** (short factual line from the log, merged with the dump if they mentioned it).
- If a **Resolved Crisis** equivalent is **already listed** in **Existing wins** below, **do not** add it again to suggestedWins.
- **Never** auto-convert **morning plan tasks** (completed or not) into suggestedWins unless the founder **explicitly celebrates** that task in the **current transcript** (e.g. pride, relief, milestone). Routine completion / learning progress belongs in the task log, not as a default win.
- Do **not** add "Resolved Crisis:" for open/unresolved fires unless the dump clearly describes handling them today.
- Never duplicate the same crisis as two wins.`
        : ''

    const contextBlock = includeContext
      ? `

## Existing wins (already on card — do not duplicate; match case-insensitively for "Resolved Crisis:")
${existingWinsNorm.length ? JSON.stringify(existingWinsNorm) : '(none)'}

## Existing lessons (already on card — do not duplicate)
${existingLessonsNorm.length ? JSON.stringify(existingLessonsNorm) : '(none)'}

## Today's morning plan (tasks) — context only; do not turn into wins unless celebrated in the dump
${morningTasksNorm.length ? JSON.stringify(morningTasksNorm) : '(none)'}

## Emergency logs (today)
${emergencyLogsForPrompt.length ? JSON.stringify(emergencyLogsForPrompt) : '(none)'}
${emergencyBridgeInstructions}

**Priority:** The **current brain dump transcript** is the source of truth for new wins/lessons/reflection. Use morning tasks and emergency logs only to disambiguate or to inject **Resolved Crisis:** per the bridge — not to pad wins with routine work.`
      : ''

    const systemPrompt = `You are a Librarian. Extract only raw facts from the user's transcript. Place wins in suggestedWins, lessons in suggestedLessons, and reflections in suggestedReflection (Daily synthesis). If the user does not provide content for a specific category, use an empty string for suggestedReflection or an empty array for wins/lessons.

Return ONLY a raw JSON object — no Markdown, no code fences, no preamble. First character "{", last character "}".

Schema:
{
  "suggestedReflection": string,
  "suggestedWins": string[],
  "suggestedLessons": string[]
}

Rules:
- DO NOT invent, analyze, moralize, or add motivational commentary. Do not write therapy-style summaries.
- **Signal vs. noise:** Proactively inject **only** **Resolved Crisis:** wins from the Emergency logs bridge — not routine completed tasks or generic learning unless the founder **explicitly** frames them as a win in the **current transcript**.
- If a resolved/contained crisis is **already** in **Existing wins** (or clearly the same text), **omit** it from suggestedWins.
- "suggestedReflection": Verbatim-style synthesis only from words they said; if they gave nothing suitable for a short journal line, return "".
- "suggestedWins": Up to 8 short lines: **new** wins from the transcript first, plus **Resolved Crisis:** lines per the bridge only when not already in Existing wins. [] if none.
- "suggestedLessons": Up to 8 short lines from what they said about what they'd do differently or learned. [] if none.

Avoid duplicating the same idea in wins and lessons. Keep lines concise.`

    const userPrompt = `Brain dump:
"""
${brainDump.slice(0, 12000)}
"""
${contextBlock}

Output only the JSON object.`

    const raw = await generateAIPrompt({
      models: PRO_MORNING_MODEL_CANDIDATES,
      temperature: 0.2,
      systemPrompt,
      userPrompt,
      maxTokens: 1100,
    })

    const parsed = parseSortJson(raw)

    return NextResponse.json(parsed)
  } catch (e) {
    console.error('[evening/sort-dump]', e)
    return NextResponse.json({ error: 'Sorting failed' }, { status: 500 })
  }
}
