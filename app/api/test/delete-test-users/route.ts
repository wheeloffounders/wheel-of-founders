import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

const TEST_PREFIX = 'test_user_'
const TEST_SUFFIX = '@example.com'
const TABLE_MISSING_CODES = new Set(['42P01', 'PGRST204'])
const AUTH_NOT_FOUND_HINTS = ['user not found', 'not found']

function isTestUserEmail(raw: string | null | undefined): boolean {
  const email = String(raw || '').toLowerCase().trim()
  return email.startsWith(TEST_PREFIX) && email.endsWith(TEST_SUFFIX)
}

async function deleteByUserIdIfExists(
  dbt: any,
  table: string,
  userId: string
): Promise<{ ok: boolean; ignoredMissingTable: boolean; error?: string }> {
  const { error } = await dbt.from(table).delete().eq('user_id', userId)
  if (!error) return { ok: true, ignoredMissingTable: false }
  const code = String(error.code || '')
  if (TABLE_MISSING_CODES.has(code)) {
    return { ok: true, ignoredMissingTable: true }
  }
  return { ok: false, ignoredMissingTable: false, error: error.message || `Delete failed for ${table}` }
}

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServerSupabase()
  const perPage = 200
  let page = 1
  const targetsMap = new Map<string, { id: string; email: string }>()

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const users = data.users ?? []
    for (const u of users) {
      if (isTestUserEmail(u.email)) {
        targetsMap.set(u.id, { id: u.id, email: u.email ?? '' })
      }
    }
    if (users.length < perPage) break
    page++
  }

  // Include orphan profile rows where auth user is already gone.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRows, error: profileErr } = await (db.from('user_profiles') as any)
    .select('id, email_address')
    .ilike('email_address', 'test_user_%@example.com')
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }
  for (const row of (profileRows as Array<{ id: string; email_address?: string | null }> | null) ?? []) {
    if (isTestUserEmail(row.email_address)) {
      targetsMap.set(row.id, { id: row.id, email: row.email_address || '' })
    }
  }

  const targets = Array.from(targetsMap.values())

  let deleted = 0
  const errors: string[] = []
  let ignoredMissingTables = 0
  const perTableErrorCounts: Record<string, number> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbt = db as any
  const userIdTables = [
    // Core activity + insight tables
    'morning_tasks',
    'morning_decisions',
    'morning_plan_commits',
    'evening_reviews',
    'weekly_insights',
    'monthly_insights',
    'quarterly_insights',
    'weekly_insight_selections',
    'insight_history',
    'personal_prompts',
    'personal_insights',
    // Founder DNA / feedback / behavior
    'user_unlocks',
    'user_patterns',
    'insight_feedback',
    'feedback',
    'task_postponements',
    // Notifications / delivery
    'user_notification_settings',
    'push_subscriptions',
    'notification_logs',
    'scheduled_suggestions',
    'micro_lesson_impressions',
    'user_email_variation_log',
    'email_analytics',
    'email_bounces',
    'email_ab_assignments',
    'google_calendar_tokens',
    // Other user-bound tables
    'emergencies',
    'data_exports',
    'error_logs',
    'security_logs',
    'user_sessions',
    'page_views',
    'calendar_feed_requests',
    'calendar_subscriptions',
    'session_source_events',
  ] as const

  for (const t of targets) {
    try {
      for (const table of userIdTables) {
        const r = await deleteByUserIdIfExists(dbt, table, t.id)
        if (r.ignoredMissingTable) {
          ignoredMissingTables++
          continue
        }
        if (!r.ok) {
          perTableErrorCounts[table] = (perTableErrorCounts[table] || 0) + 1
          errors.push(`${t.email || t.id}: ${table} -> ${r.error}`)
        }
      }
      const { error: profileDeleteError } = await dbt.from('user_profiles').delete().eq('id', t.id)
      if (profileDeleteError && !TABLE_MISSING_CODES.has(String(profileDeleteError.code || ''))) {
        perTableErrorCounts.user_profiles = (perTableErrorCounts.user_profiles || 0) + 1
        errors.push(`${t.email || t.id}: user_profiles -> ${profileDeleteError.message}`)
      }

      const { error: authDeleteError } = await db.auth.admin.deleteUser(t.id)
      if (authDeleteError) {
        const msg = String(authDeleteError.message || '')
        const lower = msg.toLowerCase()
        const missingAuthUser = AUTH_NOT_FOUND_HINTS.some((h) => lower.includes(h))
        if (missingAuthUser) {
          // Already deleted from auth; profile/data cleanup above is what we care about.
          deleted++
          continue
        }
        errors.push(`${t.email || t.id}: auth.users -> ${msg}`)
        continue
      }
      deleted++
    } catch (e) {
      errors.push(`${t.email || t.id}: ${e instanceof Error ? e.message : 'Delete failed'}`)
    }
  }

  return NextResponse.json({
    success: true,
    usersMatched: targets.length,
    usersDeleted: deleted,
    ignoredMissingTables,
    perTableErrorCounts,
    errors,
  })
}
