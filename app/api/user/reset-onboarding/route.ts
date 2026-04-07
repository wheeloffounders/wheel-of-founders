import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { FULL_RESET_BACKUP_TABLES, type FullResetBackupTable } from '@/lib/user/reset-account'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Scope = 'full' | 'onboarding'

type BackupTable = FullResetBackupTable

const TABLES_DELETE_BY_USER_ID: readonly BackupTable[] = FULL_RESET_BACKUP_TABLES

/**
 * Dev-oriented reset: onboarding-only (profile fields) or full wipe of journal + related rows + streaks/badges.
 * Authenticated user may only reset their own data.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { scope?: Scope }
    const scope: Scope = body.scope === 'onboarding' ? 'onboarding' : 'full'
    const userId = session.user.id
    const db = getServerSupabase()

    if (scope === 'onboarding') {
      const nowIso = new Date().toISOString()
      const { error } = await (db.from('user_profiles') as any)
        .update({
          primary_goal_text: null,
          struggles: null,
          struggles_other: null,
          onboarding_step: 0,
          onboarding_completed_at: null,
          hide_onboarding: false,
          has_seen_morning_tour: false,
          login_count: 0,
          current_streak: 0,
          updated_at: nowIso,
        })
        .eq('id', userId)

      if (error) {
        console.error('[reset-onboarding] onboarding profile update', error)
        return NextResponse.json({ error: 'Failed to reset onboarding' }, { status: 500 })
      }
      return NextResponse.json({ success: true, scope: 'onboarding' })
    }

    const deletedRows: Partial<Record<BackupTable, Record<string, unknown>[]>> = {}
    const deletedCounts: Partial<Record<BackupTable, number>> = {}
    for (const table of TABLES_DELETE_BY_USER_ID) {
      const { data, error } = await (db.from(table) as any).select('*').eq('user_id', userId)
      if (error) {
        console.error(`[reset-onboarding] select ${table}`, error)
        return NextResponse.json({ error: `Failed to back up ${table}` }, { status: 500 })
      }
      const rows = Array.isArray(data) ? data : []
      deletedRows[table] = rows
      deletedCounts[table] = rows.length
    }

    const { data: profileBefore, error: profileReadError } = await (db.from('user_profiles') as any)
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (profileReadError) {
      console.error('[reset-onboarding] read user_profiles', profileReadError)
      return NextResponse.json({ error: 'Failed to back up profile' }, { status: 500 })
    }

    const { data: notificationBefore, error: notifReadError } = await (db.from('user_notification_settings') as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (notifReadError) {
      console.error('[reset-onboarding] read user_notification_settings', notifReadError)
      return NextResponse.json({ error: 'Failed to back up notification settings' }, { status: 500 })
    }

    let backupId: string | null = null
    let undoExpiresAt: string | null = null
    let warning: string | null = null
    const expiresAt = new Date(Date.now() + 10_000).toISOString()
    const { data: backupRow, error: backupError } = await (db.from('reset_backups') as any)
      .insert({
        user_id: userId,
        backup_payload: {
          deletedRows,
          profileBefore: profileBefore ?? null,
          notificationBefore: notificationBefore ?? null,
        },
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single()
    if (backupError || !backupRow?.id) {
      const msg = String((backupError as { message?: string } | null)?.message ?? '')
      // Allow reset to proceed in environments where migration 111 is not applied yet.
      if (msg.includes('relation') && msg.includes('reset_backups')) {
        warning = 'Reset backup unavailable (run migration 111_reset_backups.sql to enable Undo).'
      } else {
        console.error('[reset-onboarding] insert reset_backups', backupError)
        return NextResponse.json({ error: 'Failed to create undo backup' }, { status: 500 })
      }
    } else {
      backupId = backupRow.id as string
      undoExpiresAt = backupRow.expires_at as string
    }

    for (const table of TABLES_DELETE_BY_USER_ID) {
      const { error } = await (db.from(table) as any).delete().eq('user_id', userId)
      if (error) {
        console.error(`[reset-onboarding] delete ${table}`, error)
        return NextResponse.json({ error: `Failed to clear ${table}` }, { status: 500 })
      }
    }

    const resetWarnings: string[] = []
    // Reset a baseline first (older environments may still differ; handle gracefully).
    const nowIso = new Date().toISOString()
    const { error: profileCoreError } = await (db.from('user_profiles') as any)
      .update({
        primary_goal: null,
        primary_goal_text: null,
        current_streak: 0,
        longest_streak: 0,
        last_review_date: null,
        updated_at: nowIso,
      })
      .eq('id', userId)

    if (profileCoreError) {
      console.warn('[reset-onboarding] user_profiles core update failed', {
        message: (profileCoreError as { message?: string } | null)?.message,
      })
      resetWarnings.push('Profile core fields were not fully reset in this environment.')
    }

    // Best-effort resets for optional columns introduced over time.
    const optionalProfilePatches: Record<string, unknown>[] = [
      {
        struggles: null,
        struggles_other: null,
      },
      {
        onboarding_step: 0,
        onboarding_completed_at: null,
      },
      {
        hide_onboarding: false,
      },
      {
        badges: [],
        unlocked_features: [],
      },
      {
        profile_reminder_sent_at: null,
      },
      {
        has_seen_morning_tour: false,
        login_count: 0,
      },
    ]
    for (const patch of optionalProfilePatches) {
      const { error } = await (db.from('user_profiles') as any)
        .update({ ...patch, updated_at: nowIso })
        .eq('id', userId)
      if (error) {
        console.warn('[reset-onboarding] optional user_profiles patch failed', {
          patchKeys: Object.keys(patch),
          message: (error as { message?: string } | null)?.message,
        })
        resetWarnings.push(`Skipped optional profile patch: ${Object.keys(patch).join(', ')}`)
      }
    }

    const { error: notifError } = await (db.from('user_notification_settings') as any).upsert(
      {
        user_id: userId,
        morning_enabled: true,
        morning_time: '09:00:00',
        evening_enabled: true,
        evening_time: '18:00:00',
        weekly_insights_enabled: true,
        monthly_insights_enabled: true,
        quarterly_insights_enabled: true,
        profile_reminders_enabled: true,
        email_morning_reminder_time: '09:00:00',
        email_evening_reminder_time: '20:00:00',
        email_frequency: 'daily',
        email_unsubscribed_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (notifError) {
      console.error('[reset-onboarding] user_notification_settings', notifError)
      resetWarnings.push('Notification settings were not reset.')
    }

    return NextResponse.json({
      success: true,
      scope: 'full',
      backupId,
      undoExpiresAt,
      deletedCounts,
      warning: [warning, ...resetWarnings].filter(Boolean).join(' ') || null,
    })
  } catch (e) {
    console.error('[reset-onboarding]', e)
    return NextResponse.json(
      { error: e instanceof Error ? `Reset failed: ${e.message}` : 'Reset failed' },
      { status: 500 }
    )
  }
}
