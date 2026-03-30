import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

type BackupTable =
  | 'morning_plan_commits'
  | 'morning_tasks'
  | 'morning_decisions'
  | 'evening_reviews'
  | 'emergencies'
  | 'weekly_insights'
  | 'personal_prompts'
  | 'user_insights'
  | 'insight_history'
  | 'weekly_insight_selections'
  | 'insight_feedback'
  | 'weekly_insight_feedback'
  | 'user_unlocks'
  | 'weekly_insight_debug'

const RESTORE_PLAN: ReadonlyArray<{ table: BackupTable; onConflict: string }> = [
  { table: 'morning_plan_commits', onConflict: 'user_id,plan_date' },
  { table: 'morning_tasks', onConflict: 'id' },
  { table: 'morning_decisions', onConflict: 'id' },
  { table: 'evening_reviews', onConflict: 'id' },
  { table: 'emergencies', onConflict: 'id' },
  { table: 'weekly_insights', onConflict: 'user_id,week_start' },
  { table: 'personal_prompts', onConflict: 'id' },
  { table: 'user_insights', onConflict: 'id' },
  { table: 'insight_history', onConflict: 'user_id,insight_type,period_start,period_end' },
  { table: 'weekly_insight_selections', onConflict: 'user_id,week_start_date' },
  { table: 'insight_feedback', onConflict: 'id' },
  { table: 'weekly_insight_feedback', onConflict: 'id' },
  { table: 'user_unlocks', onConflict: 'id' },
  { table: 'weekly_insight_debug', onConflict: 'id' },
]

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { backupId?: string }
    if (!body.backupId) {
      return NextResponse.json({ error: 'backupId is required' }, { status: 400 })
    }

    const db = getServerSupabase()
    const nowIso = new Date().toISOString()
    const { data: backupRow, error: backupReadError } = await (db.from('reset_backups') as any)
      .select('id, user_id, backup_payload, expires_at, consumed_at')
      .eq('id', body.backupId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (backupReadError) {
      console.error('[undo-reset] read reset_backups', backupReadError)
      return NextResponse.json({ error: 'Failed to load reset backup' }, { status: 500 })
    }
    if (!backupRow) {
      return NextResponse.json({ error: 'Reset backup not found' }, { status: 404 })
    }
    if (backupRow.consumed_at) {
      return NextResponse.json({ error: 'Undo already used for this reset' }, { status: 409 })
    }
    if (new Date(backupRow.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Undo window expired' }, { status: 410 })
    }

    const payload = (backupRow.backup_payload ?? {}) as {
      deletedRows?: Partial<Record<BackupTable, Record<string, unknown>[]>>
      profileBefore?: Record<string, unknown> | null
      notificationBefore?: Record<string, unknown> | null
    }
    const deletedRows = payload.deletedRows ?? {}

    for (const item of RESTORE_PLAN) {
      const rows = deletedRows[item.table]
      if (!Array.isArray(rows) || rows.length === 0) continue
      const { error } = await (db.from(item.table) as any).upsert(rows, { onConflict: item.onConflict })
      if (error) {
        console.error(`[undo-reset] restore ${item.table}`, error)
        return NextResponse.json({ error: `Failed to restore ${item.table}` }, { status: 500 })
      }
    }

    if (payload.profileBefore && typeof payload.profileBefore === 'object') {
      const profileToRestore = { ...payload.profileBefore }
      delete (profileToRestore as any).id
      const { error } = await (db.from('user_profiles') as any)
        .update({ ...profileToRestore, updated_at: nowIso })
        .eq('id', session.user.id)
      if (error) {
        console.error('[undo-reset] restore user_profiles', error)
        return NextResponse.json({ error: 'Failed to restore profile' }, { status: 500 })
      }
    }

    if (payload.notificationBefore && typeof payload.notificationBefore === 'object') {
      const notifToRestore = { ...payload.notificationBefore }
      delete (notifToRestore as any).id
      const { error } = await (db.from('user_notification_settings') as any).upsert(
        { ...notifToRestore, updated_at: nowIso, user_id: session.user.id },
        { onConflict: 'user_id' }
      )
      if (error) {
        console.error('[undo-reset] restore user_notification_settings', error)
        return NextResponse.json({ error: 'Failed to restore notification settings' }, { status: 500 })
      }
    }

    const { error: consumeError } = await (db.from('reset_backups') as any)
      .update({ consumed_at: nowIso })
      .eq('id', body.backupId)
      .eq('user_id', session.user.id)
      .is('consumed_at', null)

    if (consumeError) {
      console.error('[undo-reset] consume reset_backups', consumeError)
      return NextResponse.json({ error: 'Failed to finalize undo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[undo-reset]', err)
    return NextResponse.json({ error: 'Undo failed' }, { status: 500 })
  }
}
