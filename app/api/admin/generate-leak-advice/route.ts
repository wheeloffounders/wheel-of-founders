import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'
import type { FounderJourneyCommandCenterPayload } from '@/lib/admin/tracking'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FOUNDER_EMAIL = 'wttmotivation@gmail.com'

async function isAuthorizedAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true

  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c: { name: string; value: string; options?: object }[]) =>
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options as object)),
      },
    }
  )
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user?.id) return false

  const db = getServerSupabase()
  const { data: profile } = await db.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle()

  const row = profile as { is_admin?: boolean | null } | null
  if (row?.is_admin) return true

  return user.email === FOUNDER_EMAIL
}

const MRS_DEER_SYSTEM = `You are Mrs. Deer, a strategic advisor for founders. Analyze the user drop-off data you receive. Identify if a specific archetype is leaking (for example, "Hustlers are leaving at the Evening stage"). Provide a two-sentence tactical fix for the UI to retain them: sentence one = diagnosis; sentence two = what to change in product or copy.

You will receive JSON: milestone funnel (onboarding → first morning → first evening → 3-day streak → badge tier 1), optional heuristic "deerAdvice" lines, retention by shadow archetype, cohort shadowDistribution and shadowSummary, and emergency trust metrics. Use founder psychology and empathetic reasoning—no corporate jargon.

Rules: Exactly two sentences total. No bullet lists. No markdown. British/US neutral. If data is thin, say so briefly in sentence one, then still give your best tactical sentence two.

Note: This is often a small beta group (roughly 1–5 users). Provide highly specific, individual-focused observations rather than broad statistical trends.

When providing advice, look at shadowDistribution and shadowSummary: if the cohort is dominated by one archetype, tailor the UX fix to their needs (e.g. Hustlers need speed and low friction; Strategists need clarity and data depth; Visionaries need meaning and horizon; Builders need execution and checkboxes).`

/**
 * POST body: `{ payload: FounderJourneyCommandCenterPayload }` (from /api/admin/founder-journey-dashboard).
 * Uses OpenRouter with Gemini / Claude–class models first (empathy + nuance for founder psychology).
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { payload?: FounderJourneyCommandCenterPayload }
    const payload = body.payload
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }

    const userPrompt = `Analyze this admin snapshot and respond in two sentences only.\n\n${JSON.stringify(
      {
        dateRangeStart: payload.dateRangeStart,
        dateRangeEnd: payload.dateRangeEnd,
        funnel: payload.funnel,
        deerAdvice: payload.deerAdvice,
        shadowDistribution: payload.shadowDistribution,
        shadowSummary: payload.shadowSummary,
        retentionByShadow: payload.retentionByShadow,
        emergency: payload.emergency,
        sensors: payload.sensors,
        pulseShadowDistribution: payload.pulse.shadowDistribution,
        generatedAt: payload.generatedAt,
      },
      null,
      2
    )}`

    const text = await generateAIPrompt({
      systemPrompt: MRS_DEER_SYSTEM,
      userPrompt,
      maxTokens: 500,
      temperature: 0.45,
      models: [
        'google/gemini-2.0-flash-001',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3.5-haiku',
        'openai/gpt-4o-mini',
      ],
    })

    return NextResponse.json({ advice: text.trim() })
  } catch (e) {
    console.error('[admin/generate-leak-advice]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate advice' },
      { status: 500 }
    )
  }
}
