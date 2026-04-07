import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import { generateAIPrompt, PRO_MORNING_MODEL_CANDIDATES } from '@/lib/ai-client'
import { sanitizeAiJsonText } from '@/lib/morning/sanitize-ai-json-text'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_LEN = 8

type EmergencyInput = { description: string; severity: string; resolved: boolean }

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

function parseSortJson(raw: string): { suggestedDescription: string; suggestedNotes: string } {
  const trimmed = sanitizeAiJsonText(raw).trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { suggestedDescription: '', suggestedNotes: '' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { suggestedDescription: '', suggestedNotes: '' }
  }
  const o = parsed as Record<string, unknown>
  const suggestedDescription =
    typeof o.suggestedDescription === 'string'
      ? o.suggestedDescription.trim().slice(0, 4000)
      : typeof o.description === 'string'
        ? o.description.trim().slice(0, 4000)
        : ''
  const suggestedNotes =
    typeof o.suggestedNotes === 'string'
      ? o.suggestedNotes.trim().slice(0, 4000)
      : typeof o.notes === 'string'
        ? o.notes.trim().slice(0, 4000)
        : ''
  return { suggestedDescription, suggestedNotes }
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
      console.error('[emergency/sort-brain-dump] profile', profileError)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    const tierInput = profileRow as TierProfileInput | null
    const devBypass = process.env.NODE_ENV === 'development'
    if (getEffectiveUserTier(tierInput) !== 'pro' && !devBypass) {
      return NextResponse.json(
        { error: 'Emergency brain dump sorting requires Pro or trial access' },
        { status: 403 }
      )
    }

    let body: {
      brainDump?: string
      fireDate?: string
      existingDescription?: string
      existingNotes?: string
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

    const fireDateRaw = typeof body.fireDate === 'string' ? body.fireDate.trim() : ''
    const fireDate = /^\d{4}-\d{2}-\d{2}$/.test(fireDateRaw) ? fireDateRaw : null
    if (!fireDate) {
      return NextResponse.json({ error: 'fireDate required (YYYY-MM-DD)' }, { status: 400 })
    }

    const existingDescription =
      typeof body.existingDescription === 'string' ? body.existingDescription.trim().slice(0, 8000) : ''
    const existingNotes = typeof body.existingNotes === 'string' ? body.existingNotes.trim().slice(0, 8000) : ''
    let emergenciesNorm = normalizeEmergencies(body.todayEmergencies)

    if (emergenciesNorm.length === 0) {
      const { data: rows } = await db
        .from('emergencies')
        .select('description, severity, resolved')
        .eq('user_id', session.user.id)
        .eq('fire_date', fireDate)
        .order('created_at', { ascending: false })
        .limit(20)
      if (rows?.length) {
        emergenciesNorm = rows.map((row) => {
          const r = row as Record<string, unknown>
          const desc = typeof r.description === 'string' ? r.description.trim() : ''
          const sevRaw = typeof r.severity === 'string' ? r.severity.trim().toLowerCase() : ''
          const severity = sevRaw === 'hot' || sevRaw === 'warm' || sevRaw === 'contained' ? sevRaw : 'warm'
          return {
            description: desc.slice(0, 500),
            severity,
            resolved: Boolean(r.resolved),
          }
        })
      }
    }

    const contextBlock = `## Existing compose draft (do not contradict without cause)
**Description (What's the fire?):**
${existingDescription || '(empty)'}

**Notes:**
${existingNotes || '(empty)'}

## Emergency logs for this fire date (${fireDate})
${emergenciesNorm.length ? JSON.stringify(emergenciesNorm) : '(none yet)'}`

    const systemPrompt = `You are a Librarian for **Emergency Mode only**. The founder is venting into a brain dump while managing an active crisis.

Return ONLY a raw JSON object — no Markdown, no code fences, no preamble. First character "{", last character "}".

Schema:
{
  "suggestedDescription": string,
  "suggestedNotes": string
}

Rules:
- **Scope:** Clarify the **current crisis** for the emergency log form ("What's the fire?" and notes). This is NOT evening reflection — do **not** produce wins, lessons, daily gratitude, or long-form journaling.
- **Signal vs. noise:** Extract concrete facts: what broke, who is affected, urgency, and the next physical step if obvious.
- **suggestedDescription:** One tight block suitable for "What's the fire?" (can be 1–4 short sentences). If the transcript is mostly noise, still give the best-effort summary of the active threat.
- **suggestedNotes:** Optional context: constraints, stakeholders, links, emotional temperature — or "" if nothing additive.
- If existing draft text already covers a point, merge or refine rather than repeating verbatim.
- Keep both fields concise. Empty string allowed only when truly nothing to add (rare).`

    const userPrompt = `Brain dump (spoken vent):
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
      maxTokens: 900,
    })

    const parsed = parseSortJson(raw)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('[emergency/sort-brain-dump]', e)
    return NextResponse.json({ error: 'Sorting failed' }, { status: 500 })
  }
}
