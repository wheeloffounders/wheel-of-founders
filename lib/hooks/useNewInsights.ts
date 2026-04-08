'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns'

export interface NewInsights {
  weekly: boolean
  monthly: boolean
  quarterly: boolean
}

export function useNewInsights() {
  const [newInsights, setNewInsights] = useState<NewInsights>({
    weekly: false,
    monthly: false,
    quarterly: false,
  })
  const [totalNew, setTotalNew] = useState(0)

  const checkNewInsights = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return

    const now = new Date()
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const quarterStart = format(startOfQuarter(now), 'yyyy-MM-dd')

    const { data: seen } = await supabase
      .from('user_profiles')
      .select('last_viewed_weekly, last_viewed_monthly, last_viewed_quarterly')
      .eq('id', user.id)
      .maybeSingle()

    const [weeklyRes, monthlyRes, quarterlyRes] = await Promise.all([
      supabase
        .from('personal_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_type', 'weekly')
        .gte('prompt_date', weekStart)
        .limit(1),
      supabase
        .from('personal_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_type', 'monthly')
        .gte('prompt_date', monthStart)
        .limit(1),
      supabase
        .from('personal_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_type', 'quarterly')
        .gte('prompt_date', quarterStart)
        .limit(1),
    ])

    const newState = {
      weekly:
        (weeklyRes.data?.length ?? 0) > 0 &&
        (!seen?.last_viewed_weekly || new Date(seen.last_viewed_weekly) < new Date(weekStart)),
      monthly:
        (monthlyRes.data?.length ?? 0) > 0 &&
        (!seen?.last_viewed_monthly || new Date(seen.last_viewed_monthly) < new Date(monthStart)),
      quarterly:
        (quarterlyRes.data?.length ?? 0) > 0 &&
        (!seen?.last_viewed_quarterly || new Date(seen.last_viewed_quarterly) < new Date(quarterStart)),
    }

    setNewInsights(newState)
    setTotalNew(Object.values(newState).filter(Boolean).length)
  }, [])

  useEffect(() => {
    checkNewInsights()
  }, [checkNewInsights])

  const markAsViewed = useCallback(async (type: 'weekly' | 'monthly' | 'quarterly') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return

    await supabase
      .from('user_profiles')
      .update({ [`last_viewed_${type}`]: new Date().toISOString() })
      .eq('id', user.id)

    setNewInsights((prev) => ({ ...prev, [type]: false }))
    setTotalNew((prev) => Math.max(0, prev - 1))
  }, [])

  return { newInsights, totalNew, checkNewInsights, markAsViewed }
}
