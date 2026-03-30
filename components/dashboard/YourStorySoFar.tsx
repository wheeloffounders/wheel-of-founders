'use client'

/**
 * “Your Story So Far” — recent evening wins (last 14 days), light green card.
 * Served via GET /api/founder-dna/your-story with Tuesday + 7d refresh windows.
 */
import { useEffect, useState } from 'react'
import { Sparkles, Lock } from 'lucide-react'
import { SCHEDULE_STORY_SO_FAR_DAY } from '@/lib/founder-dna/unlock-schedule-config'
import { YOUR_STORY_INSIGHT_FALLBACK, insightBodyForDisplay } from '@/lib/founder-dna/your-story-shared'

interface Win {
  text: string
  date: string
  formattedDate: string
  mrsDeerInsight?: string
}

type YourStorySoFarProps = {
  showCardTitle?: boolean
}

export function YourStorySoFar({ showCardTitle = true }: YourStorySoFarProps) {
  const [wins, setWins] = useState<Win[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [daysSince, setDaysSince] = useState(0)
  const [hasEnoughData, setHasEnoughData] = useState(false)
  const [nextUpdate, setNextUpdate] = useState<string | null>(null)

  useEffect(() => {
    fetchWins()
  }, [])

  const fetchWins = async () => {
    try {
      const res = await fetch('/api/founder-dna/your-story', { credentials: 'include' })

      if (res.status === 403) {
        const json = (await res.json()) as {
          progress?: { daysActive: number; target: number; remaining: number }
        }
        setDaysSince(json.progress?.daysActive ?? 0)
        setHasEnoughData(false)
        setWins([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error('Failed to load your story')

      const json = (await res.json()) as {
        wins?: Win[]
        totalCount?: number
        nextUpdate?: string
      }

      setHasEnoughData(true)
      setDaysSince(SCHEDULE_STORY_SO_FAR_DAY)
      setWins(Array.isArray(json.wins) ? json.wins : [])
      setTotalCount(typeof json.totalCount === 'number' ? json.totalCount : 0)
      setNextUpdate(typeof json.nextUpdate === 'string' ? json.nextUpdate : null)
    } catch (error) {
      console.error('[YourStorySoFar] Error fetching wins:', error)
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
            <div key={i} className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!hasEnoughData) {
    const daysRemaining = Math.max(0, SCHEDULE_STORY_SO_FAR_DAY - daysSince)
    return (
      <div className="bg-[#f0f5ee] dark:bg-gray-800 rounded-lg p-6 opacity-60">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-gray-400 shrink-0" aria-hidden />
          {showCardTitle ? (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Story So Far</h2>
          ) : (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Locked</span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unlocks on day {SCHEDULE_STORY_SO_FAR_DAY} active
          {daysRemaining > 0 ? ` (${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}).` : '.'} Your story is
          still being written.
        </p>
      </div>
    )
  }

  if (wins.length === 0) return null

  return (
    <div className="bg-[#f0f5ee] dark:bg-gray-800 rounded-lg p-6">
      {showCardTitle ? (
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#ef725c]" aria-hidden />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Story So Far</h2>
        </div>
      ) : null}

      <div className="space-y-4">
        {wins.map((win, index) => (
          <div key={index} className="flex gap-2 text-sm">
            <span className="text-[#ef725c] shrink-0 mt-0.5" aria-hidden>
              ✓
            </span>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-gray-500 dark:text-gray-400 text-xs">{win.formattedDate}:</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">&quot;{win.text}&quot;</span>
              </div>
              <p className="text-[#ef725c] text-xs mt-1 leading-relaxed">
                — Mrs. Deer: &quot;
                {insightBodyForDisplay(win.mrsDeerInsight, YOUR_STORY_INSIGHT_FALLBACK)}&quot;
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalCount > wins.length ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
          +{totalCount - wins.length} more wins in this snapshot (last 14 days)
        </p>
      ) : null}
    </div>
  )
}
