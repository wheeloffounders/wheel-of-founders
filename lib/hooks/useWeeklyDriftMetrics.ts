'use client'

import { useEffect, useState } from 'react'
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { buildWeeklyDriftMetrics } from '@/lib/weekly/build-weekly-drift-metrics'
import type { WeeklyArchetypeDriftMetrics } from '@/lib/weekly/compute-weekly-archetype-drift'
import type { DayData } from '@/lib/weekly-analysis'

const EMPTY: WeeklyArchetypeDriftMetrics = {
  needleMoversCompleted: 0,
  needleMoversTotal: 0,
  proactivePct: 0,
  avgMood: null,
  avgEnergy: null,
  daysCompleted: 0,
  daysInWeek: 7,
  bestDayName: null,
}

/** Week-scoped metrics for WeeklyArchetypeDriftCard (Rhythm + fallback surfaces). */
export function useWeeklyDriftMetrics(weekStartIso?: string | null) {
  const [metrics, setMetrics] = useState<WeeklyArchetypeDriftMetrics>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const session = await getUserSession()
        if (!session) return

        const weekStart =
          weekStartIso && /^\d{4}-\d{2}-\d{2}$/.test(weekStartIso)
            ? new Date(`${weekStartIso}T12:00:00`)
            : startOfWeek(new Date(), { weekStartsOn: 1 })
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const startStr = format(weekStart, 'yyyy-MM-dd')
        const endStr = format(weekEnd, 'yyyy-MM-dd')
        const now = new Date()

        let daysCompleted = 0
        for (let d = new Date(weekStart); d <= now && d <= weekEnd; d = addDays(d, 1)) {
          daysCompleted++
        }

        const [tasksRes, reviewsRes] = await Promise.all([
          supabase
            .from('morning_tasks')
            .select('plan_date, needle_mover, completed, is_proactive')
            .gte('plan_date', startStr)
            .lte('plan_date', endStr)
            .eq('user_id', session.user.id),
          supabase
            .from('evening_reviews')
            .select('review_date, mood, energy')
            .gte('review_date', startStr)
            .lte('review_date', endStr)
            .eq('user_id', session.user.id),
        ])

        const tasks = tasksRes.data ?? []
        const reviews = reviewsRes.data ?? []

        const needleMoversTotal = tasks.filter((t) => t.needle_mover).length
        const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length
        const proactiveCount = tasks.filter((t) => t.is_proactive === true).length
        const proactivePct = tasks.length > 0 ? Math.round((proactiveCount / tasks.length) * 100) : 0

        const moods = reviews.map((r) => r.mood).filter((m): m is number => m != null)
        const energies = reviews.map((r) => r.energy).filter((e): e is number => e != null)
        const avgMood =
          moods.length > 0 ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null
        const avgEnergy =
          energies.length > 0
            ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
            : null

        const tasksByDate = new Map<string, (typeof tasks)[0][]>()
        tasks.forEach((t) => {
          const d = t.plan_date
          if (d) {
            if (!tasksByDate.has(d)) tasksByDate.set(d, [])
            tasksByDate.get(d)!.push(t)
          }
        })
        const reviewByDate = new Map(reviews.map((r) => [r.review_date, r]))

        const dayData: DayData[] = []
        for (let d = new Date(weekStart); d <= weekEnd; d = addDays(d, 1)) {
          const dateStr = format(d, 'yyyy-MM-dd')
          const dayTasks = tasksByDate.get(dateStr) ?? []
          const review = reviewByDate.get(dateStr)
          dayData.push({
            date: dateStr,
            needleMovers: dayTasks.filter((t) => t.needle_mover).length,
            needleMoversCompleted: dayTasks.filter((t) => t.needle_mover && t.completed).length,
            mood: review?.mood ?? null,
            energy: review?.energy ?? null,
            wins: [],
            lessons: [],
            eveningInsight: null,
          })
        }

        if (!cancelled) {
          setMetrics(
            buildWeeklyDriftMetrics({
              needleMoversCompleted,
              needleMoversTotal,
              proactivePct,
              avgMood,
              avgEnergy,
              daysCompleted,
              daysInWeek: 7,
              dayData,
            }),
          )
        }
      } catch {
        if (!cancelled) setMetrics(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [weekStartIso])

  return { metrics, loading }
}
