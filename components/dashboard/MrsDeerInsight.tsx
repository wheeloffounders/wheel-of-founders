'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MarkdownText } from '@/components/MarkdownText'
import {
  filterInsightLabels,
  scrubGenericSynthesisTransitions,
  stripRedundantLeadingHeadings,
} from '@/lib/insight-utils'
import { format } from 'date-fns'
import Link from 'next/link'

export function MrsDeerInsight() {
  const [expanded, setExpanded] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsight = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const todayStart = new Date(today + 'T00:00:00').toISOString()
      const todayEnd = new Date(today + 'T23:59:59').toISOString()

      let data: { prompt_text?: string; generated_at?: string } | null = null

      const { data: byDate } = await supabase
        .from('personal_prompts')
        .select('prompt_text, generated_at')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (byDate) {
        data = byDate as { prompt_text?: string; generated_at?: string }
      } else {
        const { data: byGenerated } = await supabase
          .from('personal_prompts')
          .select('prompt_text, generated_at')
          .eq('user_id', user.id)
          .gte('generated_at', todayStart)
          .lte('generated_at', todayEnd)
          .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        data = byGenerated as { prompt_text?: string; generated_at?: string } | null
      }

      if (data?.prompt_text) {
        setInsight(data.prompt_text)
        setGeneratedAt(data.generated_at ?? null)
      }
      setLoading(false)
    }
    fetchInsight()
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>
    )
  }

  if (!insight) return null

  const displayInsight = scrubGenericSynthesisTransitions(
    stripRedundantLeadingHeadings(filterInsightLabels(insight))
  )
  const words = displayInsight.split(/\s+/)
  const preview = words.slice(0, 25).join(' ') + (words.length > 25 ? '...' : '')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[#f0e8e0] dark:hover:bg-gray-700 md:items-center md:gap-3 md:py-2.5 bg-[#f8f4f0] dark:bg-gray-700/50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-xl" aria-hidden>
            🦌
          </span>
          <span className="truncate font-medium text-gray-900 dark:text-white">
            Mrs. Deer&apos;s Insight
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start md:self-center">
          {generatedAt ? (
            <span className="whitespace-nowrap text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {format(new Date(generatedAt), 'h:mm a')}
            </span>
          ) : null}
          {expanded ? <ChevronUp className="h-5 w-5 shrink-0" aria-hidden /> : <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />}
        </div>
      </button>

      {expanded ? (
        <div className="flex flex-col p-4">
          <MarkdownText className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100 leading-relaxed [&_p]:leading-relaxed [&_li]:leading-relaxed">
            {displayInsight}
          </MarkdownText>
          <div className="mt-4 flex justify-end">
            <Link
              href={`/history?date=${format(new Date(), 'yyyy-MM-dd')}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-[#ef725c] hover:text-[#f28771] py-2"
            >
              View in History →
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {/** Mobile: stacked + tap target. md+: inline after preview to save vertical space. */}
          <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            <span className="block md:inline">{preview}</span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-end text-sm font-medium text-[#ef725c] hover:text-[#f28771] md:mt-0 md:ml-1.5 md:inline md:min-h-0 md:w-auto md:justify-start md:py-0 md:align-baseline"
            >
              Read more →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
