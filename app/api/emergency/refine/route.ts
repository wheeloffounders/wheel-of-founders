import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { refineContainmentPlanText } from '@/lib/emergency-refine-containment'
import { getFeatureAccess, type UserProfile } from '@/lib/features'

export const dynamic = 'force-dynamic'

function profileForAccess(profile: { tier?: string | null; pro_features_enabled?: boolean | null } | null): UserProfile {
  if (!profile) return { tier: 'free', pro_features_enabled: false }
  return {
    tier: profile.tier ?? 'beta',
    pro_features_enabled: profile.pro_features_enabled ?? true,
  }
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, 'emergency', async () => {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profile } = await db
      .from('user_profiles')
      .select('tier, pro_features_enabled')
      .eq('id', session.user.id)
      .maybeSingle()

    const access = getFeatureAccess(profileForAccess(profile as { tier?: string | null; pro_features_enabled?: boolean | null } | null))
    if (!access.emergencyRefineContainment) {
      return NextResponse.json({ error: 'Pro feature', code: 'PRO_REQUIRED' }, { status: 403 })
    }

    let body: { emergencyId?: string; containmentPlan?: string }
    try {
      body = (await req.json()) as typeof body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const emergencyId = typeof body.emergencyId === 'string' ? body.emergencyId.trim() : ''
    const rawPlan = typeof body.containmentPlan === 'string' ? body.containmentPlan.trim() : ''

    if (!emergencyId || !rawPlan) {
      return NextResponse.json({ error: 'emergencyId and containmentPlan are required' }, { status: 400 })
    }
    if (rawPlan.length > 12000) {
      return NextResponse.json({ error: 'Plan too long' }, { status: 400 })
    }

    const { data: row, error: fetchError } = await db
      .from('emergencies')
      .select('id, user_id, description, triage_json, containment_plan_committed_at')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
    }

    const r = row as {
      user_id: string
      description: string
      triage_json?: unknown
      containment_plan_committed_at?: string | null
    }
    if (r.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (r.containment_plan_committed_at) {
      return NextResponse.json({ error: 'Plan already committed' }, { status: 400 })
    }

    let triageContext: string | null = null
    if (r.triage_json && typeof r.triage_json === 'object') {
      triageContext = JSON.stringify(r.triage_json)
    }

    let refined: string
    try {
      refined = await refineContainmentPlanText({
        fireDescription: r.description,
        triageContext,
        rawPlan,
      })
    } catch (e) {
      console.error('[emergency/refine] AI failed:', e)
      return NextResponse.json({ error: 'Failed to refine plan' }, { status: 502 })
    }

    return NextResponse.json({ refinedText: refined.trim() })
  })
}
