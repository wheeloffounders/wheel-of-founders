import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'
import { AIError, generateAIPrompt } from '@/lib/ai-client'
import type { FounderJourneyCommandCenterPayload } from '@/lib/admin/tracking'
import {
  STRATEGIC_ADVISOR_MODELS,
  MRS_DEER_STRATEGIC_SYSTEM,
  buildStrategicAdvisorUserPrompt,
  formatFallbackDeerAdviceMarkdown,
} from '@/lib/admin/deer-strategic-advisor'

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

/**
 * POST body: `{ payload: FounderJourneyCommandCenterPayload }` (from /api/admin/founder-journey-dashboard).
 * Returns Markdown strategic review; on AI failure returns 200 with `fallback: true` and rule-based markdown.
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

    try {
      const text = await generateAIPrompt({
        systemPrompt: MRS_DEER_STRATEGIC_SYSTEM,
        userPrompt: buildStrategicAdvisorUserPrompt(payload),
        maxTokens: 2000,
        temperature: 0.45,
        models: [...STRATEGIC_ADVISOR_MODELS],
        onModelAttempt: (model) => {
          console.log('Attempting Model:', model)
        },
      })
      return NextResponse.json({ advice: text.trim(), fallback: false })
    } catch (e) {
      console.error('[admin/generate-deer-advice] AI failure — using rule-based fallback. Full error:', e)
      if (e instanceof AIError) {
        console.error('[admin/generate-deer-advice] AIError details:', {
          message: e.message,
          model: e.model,
          status: e.status,
          statusText: e.statusText,
          openRouterError: e.openRouterError,
        })
      } else if (e instanceof Error) {
        console.error('[admin/generate-deer-advice] Error name/stack:', e.name, e.stack)
      }
      const reason = e instanceof Error ? e.message : 'AI unavailable'
      return NextResponse.json({
        advice: formatFallbackDeerAdviceMarkdown(payload),
        fallback: true,
        fallbackReason: reason,
      })
    }
  } catch (e) {
    console.error('[admin/generate-deer-advice]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate advice' },
      { status: 500 }
    )
  }
}
