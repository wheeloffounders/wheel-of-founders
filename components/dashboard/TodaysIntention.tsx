'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Target } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export function TodaysIntention() {
  const [intention, setIntention] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIntention = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')

      const { data: decision } = await supabase
        .from('morning_decisions')
        .select('decision')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .maybeSingle()

      const row = decision as { decision?: string } | null
      if (row?.decision?.trim()) {
        setIntention(row.decision.trim())
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('primary_goal_text')
          .eq('id', user.id)
          .maybeSingle()

        const p = profile as { primary_goal_text?: string } | null
        if (p?.primary_goal_text?.trim()) {
          setIntention(p.primary_goal_text.trim())
        } else {
          setIntention('')
        }
      }
      setLoading(false)
    }
    fetchIntention()
  }, [])

  if (loading) return null

  return (
    <div className="bg-[#f8f4f0] dark:bg-gray-800 p-4 rounded-lg border-l-4 border-[#ef725c]">
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-[#ef725c] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Today&apos;s Intention</h2>
          {intention ? (
            <p className="text-gray-900 dark:text-white mt-1">{intention}</p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              <Link href="/morning" className="underline text-[#ef725c] hover:text-[#f28771]">
                Set your intention in your Morning Plan
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
