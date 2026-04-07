import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import { generateAIPrompt, PRO_MORNING_MODEL_CANDIDATES } from '@/lib/ai-client'
import { parseEmergencyVentSortJson, EMERGENCY_VENT_MIN_CHARS } from '@/lib/emergency/parse-emergency'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
      console.error('[emergency/sort-vent] profile', profileError)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    const tierInput = profileRow as TierProfileInput | null
    const devBypass = process.env.NODE_ENV === 'development'
    if (getEffectiveUserTier(tierInput) !== 'pro' && !devBypass) {
      return NextResponse.json(
        { error: 'Intelligent vent sorting requires Pro or trial access' },
        { status: 403 }
      )
    }

    let body: {
      vent?: string
      fireDate?: string
      mergeHint?: {
        existingDescription?: string
        existingNotes?: string
        severity?: string
      }
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const vent = typeof body.vent === 'string' ? body.vent.trim() : ''
    if (vent.length < EMERGENCY_VENT_MIN_CHARS) {
      return NextResponse.json({ error: 'Vent text too short' }, { status: 400 })
    }

    const fireDateRaw = typeof body.fireDate === 'string' ? body.fireDate.trim() : ''
    const fireDate = /^\d{4}-\d{2}-\d{2}$/.test(fireDateRaw) ? fireDateRaw : null
    if (!fireDate) {
      return NextResponse.json({ error: 'fireDate required (YYYY-MM-DD)' }, { status: 400 })
    }

    const hint = body.mergeHint
    const existingDescription =
      typeof hint?.existingDescription === 'string' ? hint.existingDescription.trim().slice(0, 8000) : ''
    const existingNotes = typeof hint?.existingNotes === 'string' ? hint.existingNotes.trim().slice(0, 8000) : ''
    const currentSeverity =
      typeof hint?.severity === 'string' ? hint.severity.trim().toLowerCase() : ''

    const mergeBlock =
      existingDescription || existingNotes || currentSeverity
        ? `## Fields already on the form (merge / refine — do not erase useful detail)
**Current severity (button):** ${currentSeverity || '(unknown)'}
**What's the fire?:** ${existingDescription || '(empty)'}
**Notes:** ${existingNotes || '(empty)'}
`
        : ''

    const systemPrompt = `You are Mrs. Deer’s **Emergency Dispatcher**. The founder is venting in free text during a crisis.

Return ONLY a raw JSON object — no Markdown, no code fences, no preamble. First character "{", last character "}".

Schema:
{
  "severity": "hot" | "warm" | "contained",
  "title": string,
  "notes": string
}

**Severity (choose one):**
- **hot** — active crisis: outages, legal/safety risk, key client escalation, “everything is on fire,” immediate revenue or trust at risk.
- **warm** — serious but not life-of-company: tight deadline, conflict, stress, needs attention today.
- **contained** — annoyance, already mitigated, low immediate risk, or mostly emotional vent with no acute operational threat.

**title:** One tight line or short paragraph for the form label “What’s the fire?” (concrete, scannable).
**notes:** Strategic context: who’s affected, next physical step, constraints — or "" if nothing to add.

Rules:
- Prefer the **vent** as the source of truth; use merge hints only to avoid losing detail the founder already typed below.
- Keep **title** concise. **notes** can be a few sentences.
- If unsure between warm and hot, choose **warm** unless the vent clearly demands **hot**.`

    const userPrompt = `Vent (raw):
"""
${vent.slice(0, 12000)}
"""

Fire date: ${fireDate}

${mergeBlock}

Output only the JSON object.`

    const raw = await generateAIPrompt({
      models: PRO_MORNING_MODEL_CANDIDATES,
      temperature: 0.15,
      systemPrompt,
      userPrompt,
      maxTokens: 700,
    })

    const parsed = parseEmergencyVentSortJson(raw)
    if (!parsed) {
      return NextResponse.json({ error: 'Could not parse sort result' }, { status: 502 })
    }

    return NextResponse.json({
      severity: parsed.severity,
      title: parsed.title,
      notes: parsed.notes,
    })
  } catch (e) {
    console.error('[emergency/sort-vent]', e)
    return NextResponse.json({ error: 'Sort failed' }, { status: 500 })
  }
}
