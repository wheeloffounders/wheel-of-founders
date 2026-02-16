import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { subDays, format } from 'date-fns'

/**
 * Founder-facing pattern analytics (last 7 days).
 * Protected by ADMIN_SECRET. Returns counts of users in each behavior pattern.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.ADMIN_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServerSupabase()
  const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  const { data: tasks } = await db
    .from('morning_tasks')
    .select('user_id, plan_date, completed, needle_mover')
    .gte('plan_date', startDate)

  const { data: reviews } = await db
    .from('evening_reviews')
    .select('user_id, review_date, mood, energy')
    .gte('review_date', startDate)

  const userIds = new Set<string>()
  ;(tasks || []).forEach((t) => userIds.add(t.user_id))
  ;(reviews || []).forEach((r) => userIds.add(r.user_id))

  const userTaskDays = new Map<string, Record<string, { total: number; completed: number; withNeedleMover: number }>>()
  for (const t of tasks || []) {
    const uid = t.user_id
    const d = t.plan_date
    if (!userTaskDays.has(uid)) userTaskDays.set(uid, {})
    const byDate = userTaskDays.get(uid)!
    if (!byDate[d]) byDate[d] = { total: 0, completed: 0, withNeedleMover: 0 }
    byDate[d].total++
    if ((t as { completed?: boolean }).completed) byDate[d].completed++
    if ((t as { needle_mover?: boolean }).needle_mover === true) byDate[d].withNeedleMover++
  }

  const userReviewDays = new Map<string, Array<{ mood: number | null; energy: number | null }>>()
  for (const r of reviews || []) {
    const uid = r.user_id
    if (!userReviewDays.has(uid)) userReviewDays.set(uid, [])
    userReviewDays.get(uid)!.push({ mood: r.mood, energy: r.energy })
  }

  let overPlanning = 0
  let needleMoverUnused = 0
  let skipsMoodEnergy = 0

  for (const uid of userIds) {
    const byDate = userTaskDays.get(uid)
    const reviewDays = userReviewDays.get(uid) || []

    if (byDate) {
      const arr = Object.values(byDate)
      const overPlanningDays = arr.filter(
        (d) => d.total >= 1 && d.completed / d.total < 0.5
      ).length
      if (overPlanningDays >= 5) overPlanning++

      const anyNeedleMover = arr.some((d) => d.withNeedleMover > 0)
      if (arr.length >= 3 && !anyNeedleMover) needleMoverUnused++
    }

    const skipped = reviewDays.filter((r) => r.mood == null || r.energy == null).length
    if (reviewDays.length >= 5 && skipped >= 5) skipsMoodEnergy++
  }

  const totalActive = userIds.size
  return NextResponse.json({
    period: 'last_7_days',
    totalActiveUsers: totalActive,
    behaviorPatterns: {
      over_planning: overPlanning,
      needle_mover_unused: needleMoverUnused,
      skips_mood_energy: skipsMoodEnergy,
    },
    // Percentages for quick read
    percentages: totalActive
      ? {
          over_planning: Math.round((overPlanning / totalActive) * 100),
          needle_mover_unused: Math.round((needleMoverUnused / totalActive) * 100),
          skips_mood_energy: Math.round((skipsMoodEnergy / totalActive) * 100),
        }
      : null,
  })
}
