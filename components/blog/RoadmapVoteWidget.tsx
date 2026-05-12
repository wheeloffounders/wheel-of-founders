'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Brain, Moon, RefreshCw } from 'lucide-react'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

const CARD_ICONS = [Moon, Brain, RefreshCw] as const

type RoadmapVoteWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

export function RoadmapVoteWidget({ funnelId, config }: RoadmapVoteWidgetProps) {
  const pathname = usePathname()
  const roadmapVoteOptions = config.roadmapVoteOptions
  if (!roadmapVoteOptions?.length) return null
  const { handoffContext, microPlannerLabel, title, subtitle, strategicSummary } = config
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  const selected = roadmapVoteOptions.find((o) => o.id === selectedOptionId)

  const handleClaim = () => {
    if (!selected || typeof window === 'undefined') return
    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext,
          selectedFriction: selected.id,
          selectedOptionId: selected.id,
          roadmapVote: true,
          items: [selected.seedTaskLine],
          capturedAt: new Date().toISOString(),
          source: pathname || '/blog',
        })
      )
      unlockBlogTrialGiftInSession()
      if (pathname?.startsWith('/blog')) {
        sessionStorage.setItem('last_blog_post', pathname)
      }
    } catch {
      // best effort
    }
    const q = new URLSearchParams()
    q.set('context', handoffContext)
    q.set('funnel', funnelId)
    window.location.assign(`/auth/signup?${q.toString()}`)
  }

  return (
    <section className="my-8 rounded-2xl border border-[#e8dbd5] bg-[#fdf8f6] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-1 text-sm text-[#5b4d46]">{subtitle}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {roadmapVoteOptions.map((opt, idx) => {
          const Icon = CARD_ICONS[idx] ?? Moon
          const isSel = selectedOptionId === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedOptionId(opt.id)}
              className={`flex flex-col rounded-xl bg-white p-4 text-left shadow-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef725c]/40 active:scale-[0.99] ${
                isSel
                  ? 'scale-[1.02] border-2 border-[#ef725c] shadow-md ring-2 ring-[#ef725c]/25'
                  : 'border border-[#e6d8d2] hover:scale-[1.01] hover:border-[#ef725c]/55 hover:shadow-sm'
              }`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fff3ef] text-[#ef725c]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="mt-3 text-sm font-semibold text-[#152b50]">{opt.personaTitle}</span>
              <span className="mt-1 text-sm leading-snug text-[#5b4d46]">{opt.personaDescription}</span>
            </button>
          )
        })}
      </div>

      <p
        className={`mt-4 text-sm font-medium text-[#8a4a3a] transition-opacity duration-300 ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        {selected ? `Mrs. Deer: ${selected.selectionFeedback}` : 'Mrs. Deer is listening...'}
      </p>

      <p className="mt-2 text-xs text-[#6a5a52]">{strategicSummary}</p>

      <button
        type="button"
        onClick={handleClaim}
        disabled={!selected || claiming}
        className="mt-4 inline-flex min-w-[180px] items-center justify-center rounded-lg bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {claiming
          ? 'Saving your plan...'
          : selected
            ? 'Fix this loop in my plan'
            : 'Select your friction point...'}
      </button>
    </section>
  )
}
