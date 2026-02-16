import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getFullExperiments, createExperiment, updateExperiment } from '@/lib/analytics/experiments'

async function requireAdmin(): Promise<{ ok: true } | NextResponse> {
  const session = await getUserSession()
  if (!session?.user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { ok: true }
}

/**
 * GET: List all experiments with full details (admin)
 */
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!('ok' in auth)) return auth
    const experiments = await getFullExperiments()
    return NextResponse.json({ experiments })
  } catch (e) {
    console.error('[api/admin/experiments]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST: Create a new experiment (admin)
 * Body: { name, description?, variants?, traffic_allocation?, target_metric?, start_date?, end_date? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!('ok' in auth)) return auth
    const body = await req.json().catch(() => ({}))
    const { name } = body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const experiment = await createExperiment({
      name: name.trim(),
      description: body.description ?? undefined,
      variants: Array.isArray(body.variants) ? body.variants : undefined,
      traffic_allocation: typeof body.traffic_allocation === 'object' ? body.traffic_allocation : undefined,
      target_metric: body.target_metric ?? undefined,
      start_date: body.start_date ?? undefined,
      end_date: body.end_date ?? undefined,
    })
    return NextResponse.json({ experiment })
  } catch (e) {
    console.error('[api/admin/experiments]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PATCH: Update an experiment (admin)
 * Body: { id, ...updates } - id in body or as query param
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!('ok' in auth)) return auth
    const body = await req.json().catch(() => ({}))
    const id = body.id ?? req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (['draft', 'running', 'completed'].includes(body.status)) updates.status = body.status
    if (Array.isArray(body.variants)) updates.variants = body.variants
    if (typeof body.traffic_allocation === 'object') updates.traffic_allocation = body.traffic_allocation
    if (body.target_metric !== undefined) updates.target_metric = body.target_metric
    if (body.start_date !== undefined) updates.start_date = body.start_date
    if (body.end_date !== undefined) updates.end_date = body.end_date
    const experiment = await updateExperiment(id, updates)
    return NextResponse.json({ experiment })
  } catch (e) {
    console.error('[api/admin/experiments]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
