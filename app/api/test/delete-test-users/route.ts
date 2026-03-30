import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

const TEST_PREFIX = 'test_user_'
const TEST_SUFFIX = '@example.com'

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
  const targets: Array<{ id: string; email: string }> = []

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const users = data.users ?? []
    for (const u of users) {
      const email = (u.email ?? '').toLowerCase()
      if (email.startsWith(TEST_PREFIX) && email.endsWith(TEST_SUFFIX)) {
        targets.push({ id: u.id, email: u.email ?? '' })
      }
    }
    if (users.length < perPage) break
    page++
  }

  let deleted = 0
  const errors: string[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbt = db as any
  for (const t of targets) {
    try {
      await dbt.from('morning_tasks').delete().eq('user_id', t.id)
      await dbt.from('morning_decisions').delete().eq('user_id', t.id)
      await dbt.from('morning_plan_commits').delete().eq('user_id', t.id)
      await dbt.from('evening_reviews').delete().eq('user_id', t.id)
      await dbt.from('weekly_insights').delete().eq('user_id', t.id)
      await dbt.from('monthly_insights').delete().eq('user_id', t.id)
      await dbt.from('quarterly_insights').delete().eq('user_id', t.id)
      await dbt.from('insight_history').delete().eq('user_id', t.id)
      await dbt.from('user_unlocks').delete().eq('user_id', t.id)
      await dbt.from('user_profiles').delete().eq('id', t.id)

      const { error } = await db.auth.admin.deleteUser(t.id)
      if (error) {
        errors.push(`${t.email}: ${error.message}`)
        continue
      }
      deleted++
    } catch (e) {
      errors.push(`${t.email}: ${e instanceof Error ? e.message : 'Delete failed'}`)
    }
  }

  return NextResponse.json({
    success: true,
    usersMatched: targets.length,
    usersDeleted: deleted,
    errors,
  })
}
