import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function assertOwnership(templateId: string, userId: string) {
  const db = getServerSupabase() as any
  const { data, error } = await db
    .from('task_templates')
    .select('id, user_id, name')
    .eq('id', templateId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  const typed = data as { id: string; user_id: string; name: string } | null
  if (!typed || typed.user_id !== userId) {
    return null
  }
  return typed
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: templateId } = await context.params

    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await assertOwnership(templateId, session.user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const { name, tasks } = body as {
      name?: string
      tasks?: Array<{
        id?: string
        description: string
        why_important?: string
        is_proactive?: boolean
        is_needle_mover?: boolean
        action_plan?: string
        task_order: number
      }>
    }

    const db = getServerSupabase() as any
    const nowIso = new Date().toISOString()

    if (name && name.trim() && name.trim() !== existing.name) {
      const { error: updateNameError } = await db
        .from('task_templates')
        .update({ name: name.trim(), updated_at: nowIso })
        .eq('id', templateId)
        .eq('user_id', session.user.id)

      if (updateNameError) {
        console.error('[templates/PUT] update name error', updateNameError)
        return NextResponse.json({ error: 'Failed to update template name' }, { status: 500 })
      }
    }

    if (Array.isArray(tasks)) {
      // Replace all tasks with provided list
      const { error: deleteError } = await db
        .from('template_tasks')
        .delete()
        .eq('template_id', templateId)

      if (deleteError) {
        console.error('[templates/PUT] delete tasks error', deleteError)
        return NextResponse.json({ error: 'Failed to update template tasks' }, { status: 500 })
      }

      if (tasks.length > 0) {
        const toInsert = tasks.map((t) => ({
          template_id: templateId,
          description: t.description,
          why_important: t.why_important ?? null,
          is_proactive: !!t.is_proactive,
          is_needle_mover: !!t.is_needle_mover,
          action_plan: t.action_plan ?? null,
          task_order: t.task_order,
        }))

        const { error: insertError } = await db
          .from('template_tasks')
          .insert(toInsert)

        if (insertError) {
          console.error('[templates/PUT] insert tasks error', insertError)
          return NextResponse.json({ error: 'Failed to save template tasks' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[templates/PUT] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: templateId } = await context.params

    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await assertOwnership(templateId, session.user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const db = getServerSupabase() as any
    const { error } = await db
      .from('task_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('[templates/DELETE] error', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[templates/DELETE] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

