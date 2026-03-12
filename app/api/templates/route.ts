import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase() as any

    const { data: templates, error: tmplError } = await db
      .from('task_templates')
      .select('id, name, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (tmplError) {
      console.error('[templates/GET] DB error', tmplError)
      return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
    }

    const templateList =
      (templates as Array<{ id: string; name: string; created_at?: string; updated_at?: string }> | null) ??
      []
    const templateIds = templateList.map((t) => t.id)

    let tasksByTemplate: Record<string, unknown[]> = {}

    if (templateIds.length > 0) {
      const { data: tasks, error: tasksError } = await db
        .from('template_tasks')
        .select('id, template_id, description, why_important, is_proactive, is_needle_mover, action_plan, task_order')
        .in('template_id', templateIds)
        .order('task_order', { ascending: true })

      if (tasksError) {
        console.error('[templates/GET] tasks DB error', tasksError)
        return NextResponse.json({ error: 'Failed to load template tasks' }, { status: 500 })
      }

      const grouped: Record<string, unknown[]> = {}
      const taskList = (tasks as unknown[] | null) ?? []
      taskList.forEach((row: unknown) => {
        const r = row as { template_id: string }
        const key = r.template_id
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(row)
      })
      tasksByTemplate = grouped
    }

    const result = templateList.map((t) => ({
      id: t.id,
      name: t.name,
      tasks: (tasksByTemplate[t.id] ?? []).map((row) => {
        const r = row as {
          id: string
          description: string
          why_important: string | null
          is_proactive: boolean | null
          is_needle_mover: boolean | null
          action_plan: string | null
          task_order: number
        }
        return {
          id: r.id,
          description: r.description,
          why_important: r.why_important,
          is_proactive: !!r.is_proactive,
          is_needle_mover: !!r.is_needle_mover,
          action_plan: r.action_plan,
          task_order: r.task_order,
        }
      }),
    }))

    return NextResponse.json({ templates: result })
  } catch (err) {
    console.error('[templates/GET] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { name, tasks } = body as {
      name?: string
      tasks?: Array<{
        description: string
        why_important?: string
        is_proactive?: boolean
        is_needle_mover?: boolean
        action_plan?: string
        task_order: number
      }>
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const db = getServerSupabase() as any
    const nowIso = new Date().toISOString()

    const { data: tmplRows, error: insertError } = await db
      .from('task_templates')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .limit(1)

    if (insertError || !tmplRows || tmplRows.length === 0) {
      console.error('[templates/POST] insert template error', insertError)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    const template = tmplRows[0] as { id: string; name: string }
    let createdTasks: unknown[] = []

    if (Array.isArray(tasks) && tasks.length > 0) {
      const toInsert = tasks.map((t) => ({
        template_id: template.id,
        description: t.description,
        why_important: t.why_important ?? null,
        is_proactive: !!t.is_proactive,
        is_needle_mover: !!t.is_needle_mover,
        action_plan: t.action_plan ?? null,
        task_order: t.task_order,
      }))

      const { data: taskRows, error: taskInsertError } = await db
        .from('template_tasks')
        .insert(toInsert)
        .select()

      if (taskInsertError) {
        console.error('[templates/POST] insert tasks error', taskInsertError)
        return NextResponse.json({ error: 'Template created, but failed to save tasks' }, { status: 500 })
      }

      createdTasks = taskRows ?? []
    }

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        tasks: createdTasks,
      },
    })
  } catch (err) {
    console.error('[templates/POST] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

