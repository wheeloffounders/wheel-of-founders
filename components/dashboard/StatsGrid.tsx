'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { Trophy, Target, Clock, Sun } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'

interface Stats {
  milestone: string
  actionMix: string
  timeSaved: string
  morningEvening: string
}

const timeSavedFactors: Record<string, number> = {
  systemize: 4,
  delegate_founder: 6,
  eliminate_founder: 2,
  quick_win_founder: 0.5,
  my_zone: 0,
}

function renderLabel(label: string) {
  if (label.toUpperCase() === 'MORNING/EVENING') {
    return (
      <>
        Morning/
        <br />
        Evening
      </>
    )
  }
  return label
}

export function StatsGrid() {
  const [stats, setStats] = useState<Stats>({
    milestone: '0',
    actionMix: '0%',
    timeSaved: '0h',
    morningEvening: '0/0',
  })
  const [hasTodayTasks, setHasTodayTasks] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = format(new Date(), 'yyyy-MM-dd')
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

      const { data: tasks } = await supabase
        .from('morning_tasks')
        .select('completed, is_proactive, action_plan, plan_date')
        .eq('user_id', user.id)
        .gte('plan_date', weekStart)
        .lte('plan_date', weekEnd)

      const taskList = (tasks ?? []) as { completed?: boolean; is_proactive?: boolean; action_plan?: string; plan_date?: string }[]
      const totalTasks = taskList.length
      const todayTasks = taskList.filter((t) => t.plan_date === today)
      setHasTodayTasks(todayTasks.length > 0)
      const completedTasks = taskList.filter((t) => t.completed).length
      const proactiveTasks = taskList.filter((t) => t.is_proactive === true).length
      const proactivePct = totalTasks > 0 ? Math.round((proactiveTasks / totalTasks) * 100) : 0

      let timeSaved = 0
      for (const t of taskList) {
        const plan = t.action_plan
        if (plan && timeSavedFactors[plan]) timeSaved += timeSavedFactors[plan]
      }

      const { data: reviews } = await supabase
        .from('evening_reviews')
        .select('id')
        .eq('user_id', user.id)
        .gte('review_date', weekStart)
        .lte('review_date', weekEnd)

      const morningDays = new Set(taskList.map((t) => t.plan_date).filter(Boolean))
      const eveningDays = (reviews ?? []).length

      setStats({
        milestone: `${completedTasks}/${totalTasks}`,
        actionMix: `${proactivePct}%`,
        timeSaved: `${timeSaved}h`,
        morningEvening: `${morningDays.size}/${eveningDays}`,
      })
    }
    fetchStats()
  }, [])

  const statCards = [
    { icon: Trophy, label: 'Milestone', value: stats.milestone, desc: 'tasks completed', tooltip: 'Tasks completed vs total tasks this week. Needle movers are your most important tasks.' },
    { icon: Target, label: 'Action Mix', value: stats.actionMix, desc: 'proactive', tooltip: 'Percentage of tasks marked as proactive (planned) vs reactive (unplanned). Higher proactive ratio means more intentional days.' },
    { icon: Clock, label: 'Time Saved', value: stats.timeSaved, desc: 'this week', tooltip: "Estimated time saved by using the app's systems and automations." },
    { icon: Sun, label: 'Morning/Evening', value: stats.morningEvening, desc: 'completion', tooltip: 'Days you completed morning plan vs evening reflection this week.' },
  ]

  const gridCols =
    hasTodayTasks
      ? 'grid-cols-2 md:grid-cols-2'
      : 'grid-cols-2 md:grid-cols-4'

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-transparent border-none shadow-none rounded-lg p-3 h-full"
        >
          <div className="h-full flex flex-col">
            {/* Label (top) */}
            <div className="flex items-start gap-1 text-[#ef725c] mb-1.5">
              <stat.icon className="w-4 h-4 mt-0.5" />
              <div className="text-xs font-medium uppercase tracking-wider">
                {renderLabel(stat.label)}
              </div>
              <InfoTooltip text={stat.tooltip} position="top" />
            </div>

            {/* Value (center) */}
            <div className="flex-1 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </span>
            </div>

            {/* Description (bottom) */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stat.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
