import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { TEST_SIMULATION_SOURCE } from '@/lib/test/clearSimulatedEntries'

export const dynamic = 'force-dynamic'

type CreateUsersBody = {
  count?: number
  daysWithEntries?: number
}

type CreatedUser = {
  id: string
  email: string
  daysWithEntries: number
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateUsersBody = {}
  try {
    body = (await req.json()) as CreateUsersBody
  } catch {
    body = {}
  }

  const count = Math.min(100, Math.max(1, Math.floor(Number(body.count) || 10)))
  const daysWithEntries = Math.min(45, Math.max(1, Math.floor(Number(body.daysWithEntries) || 15)))

  const db = getServerSupabase()
  const created: CreatedUser[] = []
  const errors: string[] = []

  for (let i = 1; i <= count; i++) {
    const email = `test_user_${Date.now()}_${i}@example.com`

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password: 'Test123!',
      email_confirm: true,
      user_metadata: { source: TEST_SIMULATION_SOURCE },
    })

    if (authError || !authData.user?.id) {
      errors.push(`createUser ${i}: ${authError?.message ?? 'Unknown auth error'}`)
      continue
    }

    const userId = authData.user.id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileErr } = await (db.from('user_profiles') as any).upsert(
      {
        id: userId,
        email_address: email,
        timezone: 'America/New_York',
        tier: 'beta',
        pro_features_enabled: true,
        is_test_user: true,
      },
      { onConflict: 'id' }
    )

    if (profileErr) {
      errors.push(`profile ${email}: ${profileErr.message}`)
      await db.auth.admin.deleteUser(userId)
      continue
    }

    let insertedDays = 0
    for (let day = 0; day < daysWithEntries; day++) {
      const dayStr = format(subDays(new Date(), daysWithEntries - 1 - day), 'yyyy-MM-dd')
      const committedAt = `${dayStr}T14:00:00.000Z`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskRes = await (db.from('morning_tasks') as any).insert({
        user_id: userId,
        plan_date: dayStr,
        task_order: 1,
        description: `Load test task ${day + 1}`,
        why_this_matters: 'Load test',
        needle_mover: day % 2 === 0,
        is_proactive: true,
        action_plan: day % 2 === 0 ? 'my_zone' : 'quick_win_founder',
        completed: true,
        source: TEST_SIMULATION_SOURCE,
      })
      if (taskRes.error) {
        errors.push(`morning_tasks ${email} ${dayStr}: ${taskRes.error.message}`)
        continue
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('morning_plan_commits') as any).insert({
        user_id: userId,
        plan_date: dayStr,
        committed_at: committedAt,
        original_task_count: 1,
        source: TEST_SIMULATION_SOURCE,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('morning_decisions') as any).insert({
        user_id: userId,
        plan_date: dayStr,
        decision: `Load test decision ${day + 1}`,
        decision_type: day % 2 === 0 ? 'strategic' : 'tactical',
        why_this_decision: 'Load test',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('evening_reviews') as any).insert({
        user_id: userId,
        review_date: dayStr,
        journal: `Load test journal ${day + 1}`,
        mood: 3 + (day % 3),
        energy: 3 + (day % 3),
        wins: JSON.stringify([`Load test win ${day + 1}`]),
        lessons: JSON.stringify([`Load test lesson ${day + 1}`]),
        source: TEST_SIMULATION_SOURCE,
      })

      insertedDays++
    }

    created.push({ id: userId, email, daysWithEntries: insertedDays })
  }

  return NextResponse.json({
    success: true,
    usersRequested: count,
    usersCreated: created.length,
    daysRequested: daysWithEntries,
    users: created,
    errors,
  })
}
