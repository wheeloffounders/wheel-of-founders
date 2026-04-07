import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Ensure the model’s single-sentence nudge uses an approved opening (Mrs. Deer “gentle nudge”). */
function normalizeNudgeSentence(raw: string): string {
  const t = raw.trim().replace(/^["'“”]+|["'“”]+$/g, '')
  const lower = t.toLowerCase()
  if (lower.startsWith('perhaps next time')) return t
  if (lower.startsWith('to help with that')) return t
  const rest = t.replace(/^[.,\s]+/, '')
  return rest ? `Perhaps next time we could also ${rest}` : ''
}

/**
 * POST: Save a post-fire lesson; Mrs. Deer summarizes into user_insights + emergencies row.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { emergencyId?: string; rawLesson?: string }
    const emergencyId = typeof body.emergencyId === 'string' ? body.emergencyId : ''
    const rawLesson = typeof body.rawLesson === 'string' ? body.rawLesson.trim() : ''
    if (!emergencyId || !rawLesson) {
      return NextResponse.json({ error: 'emergencyId and rawLesson required' }, { status: 400 })
    }

    const db = getServerSupabase() as any
    const { data: row, error: fetchErr } = await db
      .from('emergencies')
      .select('id, user_id, description, resolved')
      .eq('id', emergencyId)
      .maybeSingle()

    if (fetchErr) {
      console.error('[emergency/lesson-learned] emergencies select failed', {
        message: fetchErr.message,
        code: fetchErr.code,
        details: fetchErr.details,
        hint: fetchErr.hint,
      })
      return NextResponse.json(
        { error: 'Could not load emergency', details: fetchErr.message },
        { status: 500 }
      )
    }
    if (!row) {
      return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
    }
    if (row.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const desc = typeof row.description === 'string' ? row.description : ''

    const reflectionQuestion =
      "That's a solid baseline. Does that feel like enough to protect your peace next time?"

    const nudgeRaw = (
      await generateAIPrompt({
        systemPrompt: `You are Mrs. Deer — an empathetic strategist for a founder who just survived a crisis. You are NOT rewriting their lesson. You are adding a single gentle nudge.

PRIMARY RULE: The founder's exact words in "Their raw lesson note" are sacred. You never paraphrase, "improve," or replace them. Your job is ONLY to output ONE follow-up sentence — the "nudge."

THE NUDGE (exactly one sentence, max 28 words):
- MUST start with exactly one of: "Perhaps next time we could also " OR "To help with that, we might consider "
- Acknowledge context from the crisis summary only to stay relevant — do not contradict their lesson.
- If they wrote about breathing, staying calm, not panicking, or grounding yourself, your nudge must stay in that lane (habits, reminders, pace, boundaries) — do NOT pivot to unrelated business systems (e.g. Slack, escalation protocols) unless they mentioned those.
- No corporate jargon: avoid "escalation protocol," "stakeholder alignment," "SOP," "leverage," "circle back," unless the founder used those words.
- No lecturing tone. No "you should." No quotation marks around your sentence.

OUTPUT: only that single nudge sentence. Nothing else — no labels, no em dash, no repetition of their text.`,
        userPrompt: `Crisis summary: ${desc || '(none)'}

Their raw lesson note (do not repeat; your output is only the nudge sentence):
${rawLesson}`,
        maxTokens: 120,
        temperature: 0.45,
      })
    ).trim()

    const nudge = normalizeNudgeSentence(nudgeRaw)
    if (!nudge) {
      return NextResponse.json({ error: 'Could not generate insight' }, { status: 502 })
    }

    const insight = `${rawLesson} — ${nudge}`

    const today = new Date().toISOString().slice(0, 10)
    const now = new Date().toISOString()

    const insertWithSource = {
      user_id: session.user.id,
      date: today,
      insight_text: insight,
      insight_type: 'suggestion' as const,
      data_source: ['emergencies', emergencyId],
    }
    let { error: insErr } = await db.from('user_insights').insert(insertWithSource)

    const missingDataSource =
      insErr &&
      (insErr.code === 'PGRST204' ||
        /data_source/i.test(String(insErr.message ?? '')) ||
        /schema cache/i.test(String(insErr.message ?? '')))

    if (insErr && missingDataSource) {
      console.warn('[emergency/lesson-learned] user_insights insert without data_source (column missing — run migration 137)')
      const retry = await db.from('user_insights').insert({
        user_id: session.user.id,
        date: today,
        insight_text: insight,
        insight_type: 'suggestion',
      })
      insErr = retry.error
    }

    if (insErr) {
      console.error('[emergency/lesson-learned] user_insights insert failed', {
        message: insErr.message,
        code: insErr.code,
        details: insErr.details,
        hint: insErr.hint,
      })
      return NextResponse.json(
        { error: 'Could not save insight', details: insErr.message },
        { status: 500 }
      )
    }

    const { error: upErr } = await db
      .from('emergencies')
      .update({
        lesson_learned_raw: rawLesson,
        lesson_insight_text: insight,
        lesson_saved_at: now,
        updated_at: now,
      })
      .eq('id', emergencyId)
      .eq('user_id', session.user.id)

    if (upErr) {
      console.error('[emergency/lesson-learned] emergencies update failed', {
        message: upErr.message,
        code: upErr.code,
        details: upErr.details,
        hint: upErr.hint,
      })
      return NextResponse.json(
        {
          error: 'Could not save lesson on emergency',
          details: upErr.message,
          hint:
            upErr.code === '42703' || /column/i.test(upErr.message)
              ? 'Apply pending migrations (lesson columns on emergencies).'
              : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ insight, success: true, reflectionQuestion, emergencyId })
  } catch (err) {
    console.error('[emergency/lesson-learned] unexpected', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 })
  }
}
