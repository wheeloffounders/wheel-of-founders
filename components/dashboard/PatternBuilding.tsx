'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserDaysSinceFirstEntry } from '@/lib/user-utils'
import { TrendingUp, Loader2, Lock } from 'lucide-react'
import { isProduction } from '@/lib/env'

const UNLOCK_DAYS = 10
import ReactMarkdown from 'react-markdown'

export function PatternBuilding() {
  // Temporarily hide Unseen Wins card in production until the experience is fully ready.
  if (isProduction) {
    return null
  }
  const router = useRouter()
  const [pattern, setPattern] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [daysSince, setDaysSince] = useState(0)
  const [hasEnoughData, setHasEnoughData] = useState(false)

  useEffect(() => {
    const checkAndFetch = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const days = await getUserDaysSinceFirstEntry(user.id)
        setDaysSince(days)
        const enough = days >= UNLOCK_DAYS
        setHasEnoughData(enough)

        if (!enough) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('weekly_insights')
          .select('id, unseen_wins_pattern, week_start')
          .eq('user_id', user.id)
          .not('unseen_wins_pattern', 'is', null)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error

        if (data?.unseen_wins_pattern) {
          setPattern(data.unseen_wins_pattern)
          setWeekStart((data as { week_start?: string }).week_start ?? null)
        } else {
          setPattern(null)
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : JSON.stringify(err)
        const isMissingTable =
          msg.includes('relation') ||
          msg.includes('does not exist') ||
          msg.includes('schema cache') ||
          msg.includes('Could not find the table')
        if (msg && msg !== '{}' && !isMissingTable) {
          console.error('Error fetching weekly pattern:', msg)
        }
        setPattern(null)
      } finally {
        setLoading(false)
      }
    }

    checkAndFetch()
  }, [])

  const handleClick = () => {
    if (weekStart) {
      router.push(`/weekly?weekStart=${weekStart}`)
    } else {
      router.push('/weekly')
    }
  }

  if (loading) {
    return (
      <div className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p className="text-sm">Mrs. Deer is looking for patterns...</p>
        </div>
      </div>
    )
  }

  if (!hasEnoughData) {
    const daysRemaining = Math.max(0, UNLOCK_DAYS - daysSince)
    return (
      <div className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Unseen Wins - Locked
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unlocks after {daysRemaining} more days of consistent journaling. Mrs. Deer needs time to spot meaningful
          patterns.
        </p>
      </div>
    )
  }

  if (!pattern) return null

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-[#ef725c]" />
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Unseen Wins - Pattern you&apos;re building
        </p>
      </div>
      <div className="text-sm text-gray-900 dark:text-white leading-relaxed [&_p]:my-0 [&_strong]:font-semibold [&_em]:italic">
        <ReactMarkdown>{pattern}</ReactMarkdown>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 hover:text-[#ef725c] transition-colors">
        Click to view full weekly insight →
      </p>
    </div>
  )
}
