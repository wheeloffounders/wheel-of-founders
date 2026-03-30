'use client'

import Link from 'next/link'
import {
  MONTHLY_INSIGHT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'
import { ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import { colors } from '@/lib/design-tokens'
import { CircleProgress } from '@/components/ui/CircleProgress'

export type LockedFeatureType = 'weekly' | 'monthly' | 'quarterly' | 'archetype'

interface LockedFeatureProps {
  type: LockedFeatureType
  progress: { current: number; required: number }
}

function SectionRule() {
  return <hr className="my-6 border-gray-200 dark:border-gray-600" aria-hidden />
}

const CONFIG: Record<
  LockedFeatureType,
  {
    title: string
    explanation: string
    buildingToward: string
    socialProof: string
    stepLeadIn: string
    ctaHref: string
    ctaLabel: string
    closing: string
  }
> = {
  weekly: {
    title: 'Weekly Insight',
    explanation: `This unlocks after ${WEEKLY_INSIGHT_MIN_DAYS} days with entries (days you saved a morning plan or completed an evening review). After that, Mrs. Deer refreshes your weekly insight every Monday (your timezone).`,
    buildingToward:
      "When you unlock this, Mrs. Deer will look back at your week — your wins, lessons, and the thread between them — and offer a read you can actually use.",
    socialProof:
      'Founders who stick with their weekly insight often say it is the first time the week “made sense” in one place.',
    stepLeadIn:
      'Commit your morning plan for today — it counts toward your days with entries and brings your next insight closer.',
    ctaHref: '/morning',
    ctaLabel: 'Complete your morning plan →',
    closing: "Small daily steps add up. I'll be here when this page opens for you.",
  },
  monthly: {
    title: 'Monthly Insight',
    explanation: `This unlocks after ${MONTHLY_INSIGHT_MIN_DAYS} days with entries. After that, new monthly insights follow the 1st of each month (your timezone).`,
    buildingToward:
      'When you unlock this, Mrs. Deer will step back and weave a month-level story — wins, lessons, and the arc between them.',
    socialProof:
      'Founders who read their monthly insight are 3x more likely to continue their streak into the next month.',
    stepLeadIn:
      'Complete your evening reflection — it adds another day with entries and nudges you toward this milestone.',
    ctaHref: '/evening',
    ctaLabel: 'Complete your evening reflection →',
    closing: "Small daily steps add up. I'll be here when this page opens for you.",
  },
  quarterly: {
    title: 'Quarterly Trajectory',
    explanation: `This unlocks after ${QUARTERLY_INSIGHT_MIN_DAYS} days with entries so we have enough signal. After that, updates follow each quarter (Jan, Apr, Jul, Oct).`,
    buildingToward:
      "When you unlock this, Mrs. Deer will look back at your entire quarter — your wins, your lessons, your defining moments — and weave them into a story of who you're becoming.",
    socialProof: `After ${QUARTERLY_INSIGHT_MIN_DAYS} days, most founders say the Quarterly Trajectory was the moment they truly saw their own growth.`,
    stepLeadIn:
      'Complete your evening reflection — it adds one more day to your journey and gets you closer to this milestone.',
    ctaHref: '/evening',
    ctaLabel: "Complete tonight's evening reflection →",
    closing: "Small daily steps add up. I'll be here when this page opens for you.",
  },
  archetype: {
    title: 'Founder Archetype',
    explanation: `This unlocks after ${ARCHETYPE_PREVIEW_MIN_DAYS} days with entries, once Mrs. Deer has enough signal from your decisions and reflections. A fuller portrait continues to deepen as you show up.`,
    buildingToward:
      'When this opens, you will see how you tend to show up as a founder — your patterns, your edge, and the story behind the label.',
    socialProof:
      'Founders who know their archetype make decisions 2x faster and feel more aligned with their work.',
    stepLeadIn:
      'Log your evening reflection — it deepens the picture — or commit your morning plan so both sides of your day count.',
    ctaHref: '/evening',
    ctaLabel: 'Log your evening reflection →',
    closing: "Small daily steps add up. I'll be here when this page opens for you.",
  },
}

export function LockedFeature({ type, progress }: LockedFeatureProps) {
  const config = CONFIG[type]
  const current = Math.max(0, Math.floor(progress.current))
  const required = Math.max(1, Math.floor(progress.required))

  return (
    <div className="max-w-lg mx-auto px-4 py-10 text-left">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{config.title}</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{config.explanation}</p>

      <SectionRule />

      <div className="flex justify-center w-full">
        <CircleProgress current={current} target={required} size={80} unitLabel="days with entries" />
      </div>

      <SectionRule />

      <p className="text-sm font-semibold text-gray-900 dark:text-white">✨ What you&apos;re building toward:</p>
      <blockquote className="mt-2 pl-3 border-l-4 border-[#ef725c]/70 text-sm italic text-gray-700 dark:text-gray-300 leading-relaxed">
        {config.buildingToward}
      </blockquote>

      <SectionRule />

      <p className="text-sm font-semibold text-gray-900 dark:text-white">💡 Founders like you:</p>
      <blockquote className="mt-2 pl-3 border-l-4 border-amber-200/80 dark:border-amber-800/50 text-sm italic text-gray-700 dark:text-gray-300 leading-relaxed">
        {config.socialProof}
        <span className="not-italic text-gray-500 dark:text-gray-500"> — Mrs. Deer</span>
      </blockquote>

      <SectionRule />

      <p className="text-sm font-semibold text-gray-900 dark:text-white">👉 One small step today:</p>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{config.stepLeadIn}</p>
      <div className="mt-4">
        <Link
          href={config.ctaHref}
          className="inline-flex items-center px-5 py-3 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: colors.navy.DEFAULT }}
        >
          {config.ctaLabel}
        </Link>
      </div>
      {type === 'archetype' ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Prefer to start fresh?{' '}
          <Link href="/morning" className="underline font-medium text-gray-700 dark:text-gray-300">
            Go to Morning
          </Link>{' '}
          to log today&apos;s plan and decisions.
        </p>
      ) : null}

      <SectionRule />

      <p className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed">&quot;{config.closing}&quot;</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">— Mrs. Deer</p>
    </div>
  )
}
