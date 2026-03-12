import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      description,
      why_important,
      is_proactive,
      is_needle_mover,
      action_plan,
      templateName,
    } = body as {
      description?: string
      why_important?: string
      is_proactive?: boolean
      is_needle_mover?: boolean
      action_plan?: string
      templateName?: string
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }
    if (!templateName || typeof templateName !== 'string') {
      return NextResponse.json({ error: 'templateName is required' }, { status: 400 })
    }

    const db = getServerSupabase() as any

    // Find or create template by name for this user
    const { data: existing, error: findError } = await db
      .from('task_templates')
      .select('id, name')
      .eq('user_id', session.user.id)
      .eq('name', templateName.trim())
      .maybeSingle()

    if (findError) {
      console.error('[save-as-template] find template error', findError)
      return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
    }

    let templateId: string
    if (existing) {
      templateId = (existing as { id: string }).id
    } else {
      const nowIso = new Date().toISOString()
      const { data: tmplRows, error: createError } = await db
        .from('task_templates')
        .insert({
          user_id: session.user.id,
          name: templateName.trim(),
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .limit(1)

      if (createError || !tmplRows || tmplRows.length === 0) {
        console.error('[save-as-template] create template error', createError)
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
      }
      templateId = (tmplRows[0] as { id: string }).id
    }

    // Determine next task_order
    const { data: lastTask, error: lastError } = await db
      .from('template_tasks')
      .select('task_order')
      .eq('template_id', templateId)
      .order('task_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastError) {
      console.error('[save-as-template] last task error', lastError)
      return NextResponse.json({ error: 'Failed to inspect template tasks' }, { status: 500 })
    }

    const nextOrder =
      (lastTask as { task_order?: number } | null)?.task_order && (lastTask as { task_order?: number }).task_order! > 0
        ? (lastTask as { task_order: number }).task_order + 1
        : 1

    const { data: taskRow, error: insertError } = await db
      .from('template_tasks')
      .insert({
        template_id: templateId,
        description: description.trim(),
        why_important: why_important ?? null,
        is_proactive: !!is_proactive,
        is_needle_mover: !!is_needle_mover,
        action_plan: action_plan ?? null,
        task_order: nextOrder,
      })
      .select()
      .limit(1)

    if (insertError || !taskRow || taskRow.length === 0) {
      console.error('[save-as-template] insert task error', insertError)
      return NextResponse.json({ error: 'Failed to save template task' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template: {
        id: templateId,
        name: templateName.trim(),
      },
    })
  } catch (err) {
    console.error('[save-as-template] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

