'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MarkdownText } from '@/components/MarkdownText'
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>
    )
  }

  if (!insight) return null

  const preview = insight.split(/\s+/).slice(0, 25).join(' ') + (insight.split(/\s+/).length > 25 ? '...' : '')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#f8f4f0] dark:bg-gray-700/50 hover:bg-[#f0e8e0] dark:hover:bg-gray-700 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🦌</span>
          <span className="font-medium text-gray-900 dark:text-white">Mrs. Deer&apos;s Insight</span>
          {generatedAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(generatedAt), 'h:mm a')}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
      </button>

      {expanded ? (
        <div className="p-4">
          <MarkdownText className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
            {insight}
          </MarkdownText>
          <Link
            href={`/history?date=${format(new Date(), 'yyyy-MM-dd')}`}
            className="text-sm font-medium mt-3 inline-block text-[#ef725c] hover:text-[#f28771]"
          >
            View in History →
          </Link>
        </div>
      ) : (
        <div className="p-4 text-gray-600 dark:text-gray-300 text-sm flex items-center justify-between gap-3">
          <p className="flex-1">{preview}</p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm font-medium text-[#ef725c] hover:text-[#f28771] whitespace-nowrap"
          >
            Read more →
          </button>
        </div>
      )}
    </div>
  )
}
