'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flame } from 'lucide-react'
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns'

export function JourneyProgress() {
  const [streak, setStreak] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_streak')
        .eq('id', user.id)
        .maybeSingle()

      const p = profile as { current_streak?: number } | null
      setStreak(p?.current_streak ?? 0)

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
      const daysInWeek = 7

      const { data: reviews } = await supabase
        .from('evening_reviews')
        .select('review_date')
        .eq('user_id', user.id)
        .gte('review_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('review_date', format(weekEnd, 'yyyy-MM-dd'))

      const uniqueDays = new Set((reviews ?? []).map((r: { review_date?: string }) => r.review_date))
      const rate = Math.round((uniqueDays.size / daysInWeek) * 100)
      setCompletionRate(Math.min(100, rate))
    }
    fetchProgress()
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white">Journey Progress</h3>
        <div className="flex items-center gap-1 text-[#ef725c]">
          <Flame className="w-4 h-4" />
          <span className="text-sm font-medium">{streak} day streak</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-[#ef725c] h-2 rounded-full transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {completionRate}% of days completed this week
      </p>
    </div>
  )
}
