'use client'

/**
 * Unseen Wins (blue card): AI pattern from last 14 days, generated when this component mounts
 * on Founder DNA → Rhythm (`POST /api/founder-dna/unseen-wins/refresh`). Stored in `weekly_insights.unseen_wins_pattern`.
 * Not “Your Story So Far” (evening wins — see `YourStorySoFar`).
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { SCHEDULE_UNSEEN_WINS_DAY } from '@/lib/founder-dna/unlock-schedule-config'
import { TrendingUp, Loader2, Lock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

type PatternBuildingProps = {
  /** When false, omit the in-card “Unseen Wins” title (page already has a section heading). Default true. */
  showCardHeading?: boolean
  /**
   * Rhythm page: parent already applied the same rule as Founder Journey (`daysWithEntries` / `unseen_wins`).
   * Skips a separate client count that used to use “days since first activity” and could disagree with the journey.
   */
  rhythmGatedUnlock?: boolean
}

export function PatternBuilding({ showCardHeading = true, rhythmGatedUnlock = false }: PatternBuildingProps) {
  const [pattern, setPattern] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysSince, setDaysSince] = useState(0)
  const [hasEnoughData, setHasEnoughData] = useState(false)
  const [refreshError, setRefreshError] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const days = rhythmGatedUnlock
          ? SCHEDULE_UNSEEN_WINS_DAY
          : await getDaysWithEntries(user.id, supabase)
        setDaysSince(days)
        const enough = rhythmGatedUnlock || days >= SCHEDULE_UNSEEN_WINS_DAY
        setHasEnoughData(enough)

        if (!enough) {
          setLoading(false)
          return
        }

        const res = await fetch('/api/founder-dna/unseen-wins/refresh', {
          method: 'POST',
          credentials: 'include',
        })

        if (res.ok) {
          const json = (await res.json()) as { pattern?: string | null }
          setPattern(json.pattern ?? null)
          setRefreshError(false)
        } else {
          setRefreshError(true)
          const { data, error } = await supabase
            .from('weekly_insights')
            .select('unseen_wins_pattern, week_start')
            .eq('user_id', user.id)
            .not('unseen_wins_pattern', 'is', null)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!error && data?.unseen_wins_pattern) {
            setPattern(data.unseen_wins_pattern as string)
          } else {
            setPattern(null)
          }
        }
      } catch (err) {
        console.error('[PatternBuilding / Unseen Wins]', err)
        setRefreshError(true)
        setPattern(null)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [rhythmGatedUnlock])

  if (loading) {
    return (
      <div className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          {showCardHeading ? (
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Unseen Wins</span>
          ) : null}
        </div>
        <p className={`text-sm text-gray-500 dark:text-gray-400 ${showCardHeading ? 'mt-2' : ''}`}>
          Mrs. Deer is generating your Unseen Wins for this visit…
        </p>
      </div>
    )
  }

  if (!hasEnoughData) {
    const daysRemaining = Math.max(0, SCHEDULE_UNSEEN_WINS_DAY - daysSince)
    return (
      <div className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 opacity-60">
        {showCardHeading ? (
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Unseen Wins</h3>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Locked</span>
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unlocks on day {SCHEDULE_UNSEEN_WINS_DAY} active
          {daysRemaining > 0 ? ` (${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}).` : '.'} Open Rhythm to
          generate your pattern.
        </p>
      </div>
    )
  }

  if (!pattern) {
    return (
      <div className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        {showCardHeading ? (
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#ef725c] shrink-0" aria-hidden />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Unseen Wins</h3>
          </div>
        ) : null}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {refreshError
            ? 'Could not refresh Unseen Wins right now. Try again in a moment.'
            : 'Add a few evening wins, lessons, or journal notes — Mrs. Deer needs something to reflect on for your next Unseen Wins.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#e6f0fa] dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
      {showCardHeading ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#ef725c] shrink-0" aria-hidden />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Unseen Wins</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Generated when you open Rhythm from your last 14 days (saved with your week in the database).
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Generated when you open Rhythm from your last 14 days (saved with your week in the database).
        </p>
      )}
      <div className="text-sm text-gray-900 dark:text-white leading-relaxed [&_p]:my-0 [&_strong]:font-semibold [&_em]:italic">
        <ReactMarkdown>{pattern}</ReactMarkdown>
      </div>
    </div>
  )
}
