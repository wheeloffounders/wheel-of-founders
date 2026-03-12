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
    const { templateId, targetDate } = body as { templateId?: string; targetDate?: string }

    if (!templateId || !targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return NextResponse.json({ error: 'templateId and targetDate (yyyy-MM-dd) are required' }, { status: 400 })
    }

    const db = getServerSupabase() as any

    // Ensure template belongs to user
    const { data: tmpl, error: tmplError } = await db
      .from('task_templates')
      .select('id, user_id')
      .eq('id', templateId)
      .maybeSingle()

    if (tmplError) {
      console.error('[templates/apply] template error', tmplError)
      return NextResponse.json({ error: 'Failed to load template' }, { status: 500 })
    }
    const typedTemplate = tmpl as { id: string; user_id: string } | null
    if (!typedTemplate || typedTemplate.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { data: taskRows, error: tasksError } = await db
      .from('template_tasks')
      .select('id, description, why_important, is_proactive, is_needle_mover, action_plan, task_order')
      .eq('template_id', templateId)
      .order('task_order', { ascending: true })

    if (tasksError) {
      console.error('[templates/apply] tasks error', tasksError)
      return NextResponse.json({ error: 'Failed to load template tasks' }, { status: 500 })
    }

    const tasks =
      (taskRows as
        | Array<{
            id: string
            description: string
            why_important?: string | null
            is_proactive?: boolean | null
            is_needle_mover?: boolean | null
            action_plan?: string | null
            task_order: number
          }>
        | null) ?? []
    if (tasks.length === 0) {
      return NextResponse.json({ success: true, tasks: [] })
    }

    // Insert into morning_tasks for target date (append; do not delete existing)
    const inserts = tasks.map((t, idx) => ({
      user_id: session.user.id,
      plan_date: targetDate,
      task_order: idx + 1,
      description: t.description,
      why_this_matters: t.why_important ?? null,
      needle_mover: t.is_needle_mover ?? null,
      is_proactive: t.is_proactive ?? null,
      action_plan: t.action_plan ?? null,
    }))

    const { data: created, error: insertError } = await db
      .from('morning_tasks')
      .insert(inserts)
      .select()

    if (insertError) {
      console.error('[templates/apply] insert error', insertError)
      return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
    }

    return NextResponse.json({ success: true, tasks: created ?? [] })
  } catch (err) {
    console.error('[templates/apply] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

