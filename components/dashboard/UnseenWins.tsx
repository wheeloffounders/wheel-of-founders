'use client'

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { Sparkles, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserDaysSinceFirstEntry } from '@/lib/user-utils'

const UNLOCK_DAYS = 10

interface Win {
  text: string
  date: string
  formattedDate: string
}

// Mrs. Deer's gentle observations
const OBSERVATIONS = [
  'you chose presence over pressure',
  'you noticed what matters',
  "you're building together",
  'you chose done over perfect',
  'you care, maybe too much',
  'rest is part of the work',
  'these are the real metrics',
  "you're becoming the founder you needed",
  'your son is watching you build',
  'this is momentum, not just a task',
  "you're proving yourself wrong (in a good way)",
  'the system is catching you now',
  "you're breaking the pattern",
  'this is the kind of win that compounds',
  "you'll look back on this day",
  'you chose connection over code',
  'this is the work behind the work',
  "you're building belief, not just features",
  'your future self is grateful',
  'this is what sustainable looks like',
] as const

// Deterministic observation selector (same win always gets same observation)
const getObservation = (win: string): string => {
  const hash = win
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = hash % OBSERVATIONS.length
  return OBSERVATIONS[index]
}

export function UnseenWins() {
  const [wins, setWins] = useState<Win[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [daysSince, setDaysSince] = useState(0)
  const [hasEnoughData, setHasEnoughData] = useState(false)

  useEffect(() => {
    fetchWins()
  }, [])

  const fetchWins = async () => {
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

      const twoWeeksAgo = subDays(new Date(), 14)
        .toISOString()
        .split('T')[0]

      console.log('[UnseenWins] Date range (>= review_date):', twoWeeksAgo)

      // Get all wins from last 14 days
      const { data, error } = await supabase
        .from('evening_reviews')
        .select('wins, review_date')
        .eq('user_id', user.id)
        .not('wins', 'is', null)
        .gte('review_date', twoWeeksAgo)
        .order('review_date', { ascending: false })

      if (error) throw error

      const allWins: Win[] = []
      data?.forEach((review: any) => {
        let winsList: string[] = []

        if (review.wins) {
          try {
            winsList =
              typeof review.wins === 'string' &&
              (review.wins.startsWith('[') || review.wins.startsWith('"'))
                ? JSON.parse(review.wins)
                : [review.wins]
          } catch {
            winsList = [review.wins]
          }
        }

        winsList.forEach((win: string) => {
          if (win?.trim()) {
            allWins.push({
              text: win.trim(),
              date: review.review_date,
              formattedDate: format(
                new Date(review.review_date),
                'MMM d',
              ),
            })
          }
        })
      })

      const total = allWins.length
      setTotalCount(total)

      if (total === 0) {
        setWins([])
        return
      }

      // Daily rotation: use current date as seed
      const today = new Date().toDateString()
      const seed = today
        .split('')
        .reduce((a, b) => a + b.charCodeAt(0), 0)

      // Deterministic shuffle based on date
      const shuffled = [...allWins].sort((a, b) => {
        const aHash = (a.text.length + seed) % total
        const bHash = (b.text.length + seed) % total
        return aHash - bHash
      })

      // Take first 5 wins
      const selected = shuffled.slice(0, 5)
      setWins(selected)
    } catch (error) {
      console.error('Error fetching wins:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#f0f5ee] dark:bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-300 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!hasEnoughData) {
    const daysRemaining = Math.max(0, UNLOCK_DAYS - daysSince)
    return (
      <div className="bg-[#f0f5ee] dark:bg-gray-800 rounded-lg p-6 opacity-60">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Story So Far
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unlocks after {daysRemaining} more days of journaling. Your story is still being written.
        </p>
      </div>
    )
  }

  if (wins.length === 0) return null

  return (
    <div className="bg-[#f0f5ee] dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#ef725c]" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Story So Far
        </h2>
      </div>

      <div className="space-y-4">
        {wins.map((win, index) => (
          <div key={index} className="flex gap-2 text-sm">
            <span className="text-[#ef725c] shrink-0 mt-0.5">✓</span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {win.formattedDate}:
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  &quot;{win.text}&quot;
                </span>
              </div>
              <p className="text-[#ef725c] text-xs italic mt-1">
                — {getObservation(win.text)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalCount > wins.length && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
          +{totalCount - wins.length} more wins from last 14 days • new
          ones tomorrow
        </p>
      )}
    </div>
  )
}

