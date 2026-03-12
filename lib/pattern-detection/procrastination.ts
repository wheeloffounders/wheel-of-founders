import { subDays, startOfWeek, format } from 'date-fns'
import { serverSupabase } from '@/lib/supabase/server'

export interface ProcrastinationPatterns {
  repeatedTasks: {
    taskId: string
    description: string
    postponeCount: number
    actionPlan: string | null
    isNeedleMover: boolean
    firstPlanned: string
    lastPostponed: string
  }[]

  weeklyPostponeRate: {
    weekStart: string
    totalPostponed: number
    uniqueTasks: number
    byActionPlan: Record<string, number>
  }[]

  timeOfDayPatterns: {
    hour: number
    count: number
  }[]

  actionPlanPatterns: {
    actionPlan: string | null
    count: number
    percentage: number
  }[]

  overallStats: {
    totalPostponements: number
    uniqueTasksPostponed: number
    averagePostponementsPerTask: number
    mostPostponedTask: { description: string; count: number } | null
    needleMoverPostponeRate: number
  }
}

export async function detectProcrastinationPatterns(
  userId: string,
  options?: {
    days?: number
    minCount?: number
  }
): Promise<ProcrastinationPatterns> {
  const days = options?.days ?? 30
  const minCount = options?.minCount ?? 2

  const db = serverSupabase()
  const now = new Date()
  const since = subDays(now, days)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('task_postponements') as any)
    .select(
      'task_id, task_description, action_plan, original_date, moved_to_date, moved_at, is_needle_mover, is_proactive'
    )
    .eq('user_id', userId)
    .gte('moved_at', since.toISOString())

  if (error) {
    console.error('[procrastination] DB error', error)
    return {
      repeatedTasks: [],
      weeklyPostponeRate: [],
      timeOfDayPatterns: [],
      actionPlanPatterns: [],
      overallStats: {
        totalPostponements: 0,
        uniqueTasksPostponed: 0,
        averagePostponementsPerTask: 0,
        mostPostponedTask: null,
        needleMoverPostponeRate: 0,
      },
    }
  }

  type Row = {
    task_id: string
    task_description: string
    action_plan: string | null
    original_date: string
    moved_to_date: string
    moved_at: string
    is_needle_mover: boolean | null
    is_proactive: boolean | null
  }

  const rows = (data ?? []) as Row[]
  const totalPostponements = rows.length

  if (totalPostponements === 0) {
    return {
      repeatedTasks: [],
      weeklyPostponeRate: [],
      timeOfDayPatterns: [],
      actionPlanPatterns: [],
      overallStats: {
        totalPostponements: 0,
        uniqueTasksPostponed: 0,
        averagePostponementsPerTask: 0,
        mostPostponedTask: null,
        needleMoverPostponeRate: 0,
      },
    }
  }

  const countsByTask = new Map<
    string,
    {
      description: string
      actionPlan: string | null
      isNeedleMover: boolean
      firstPlanned: string
      lastPostponed: string
      count: number
    }
  >()

  const weeklyMap = new Map<
    string,
    { total: number; tasks: Set<string>; byActionPlan: Record<string, number> }
  >()

  const hourMap = new Map<number, number>()
  const actionPlanMap = new Map<string | null, number>()
  let needleMoverCount = 0

  for (const row of rows) {
    const key = row.task_id
    const existing = countsByTask.get(key)
    const movedAt = new Date(row.moved_at)
    const movedAtStr = movedAt.toISOString()
    if (existing) {
      existing.count += 1
      existing.lastPostponed =
        movedAtStr > existing.lastPostponed ? movedAtStr : existing.lastPostponed
      countsByTask.set(key, existing)
    } else {
      countsByTask.set(key, {
        description: row.task_description,
        actionPlan: row.action_plan ?? null,
        isNeedleMover: !!row.is_needle_mover,
        firstPlanned: row.original_date,
        lastPostponed: movedAtStr,
        count: 1,
      })
    }

    const weekStart = startOfWeek(movedAt, { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')
    const week = weeklyMap.get(weekKey) ?? {
      total: 0,
      tasks: new Set<string>(),
      byActionPlan: {},
    }
    week.total += 1
    week.tasks.add(row.task_id)
    const apKey = row.action_plan ?? 'none'
    week.byActionPlan[apKey] = (week.byActionPlan[apKey] ?? 0) + 1
    weeklyMap.set(weekKey, week)

    const hour = movedAt.getHours()
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1)

    const apOverall = row.action_plan ?? 'none'
    actionPlanMap.set(apOverall, (actionPlanMap.get(apOverall) ?? 0) + 1)

    if (row.is_needle_mover) needleMoverCount += 1
  }

  const repeatedTasks = Array.from(countsByTask.entries())
    .filter(([, v]) => v.count >= minCount)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([taskId, v]) => ({
      taskId,
      description: v.description,
      postponeCount: v.count,
      actionPlan: v.actionPlan,
      isNeedleMover: v.isNeedleMover,
      firstPlanned: v.firstPlanned,
      lastPostponed: v.lastPostponed,
    }))

  const weeklyPostponeRate = Array.from(weeklyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStart, v]) => ({
      weekStart,
      totalPostponed: v.total,
      uniqueTasks: v.tasks.size,
      byActionPlan: v.byActionPlan,
    }))

  const timeOfDayPatterns = Array.from(hourMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hour, count }))

  const actionPlanPatterns = Array.from(actionPlanMap.entries())
    .map(([actionPlan, count]) => ({
      actionPlan: actionPlan === 'none' ? null : actionPlan,
      count,
      percentage: Math.round((count / totalPostponements) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const totalTasks = countsByTask.size
  const averagePostponementsPerTask =
    totalTasks > 0 ? totalPostponements / totalTasks : 0

  let mostPostponedTask: { description: string; count: number } | null = null
  for (const [, v] of countsByTask.entries()) {
    if (!mostPostponedTask || v.count > mostPostponedTask.count) {
      mostPostponedTask = { description: v.description, count: v.count }
    }
  }

  const needleMoverPostponeRate =
    totalPostponements > 0 ? Math.round((needleMoverCount / totalPostponements) * 100) : 0

  return {
    repeatedTasks,
    weeklyPostponeRate,
    timeOfDayPatterns,
    actionPlanPatterns,
    overallStats: {
      totalPostponements,
      uniqueTasksPostponed: totalTasks,
      averagePostponementsPerTask,
      mostPostponedTask,
      needleMoverPostponeRate,
    },
  }
}

