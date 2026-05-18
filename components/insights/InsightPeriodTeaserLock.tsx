'use client'

import type { ReactNode } from 'react'
import { MarkdownText } from '@/components/MarkdownText'
import {
  splitMarkdownTeaser,
  TEASER_MASK_STYLE,
  TEASER_WEEKLY_REFLECTION_PREVIEW_CHARS,
} from '@/components/insights/InsightTeaserBlur'
import { WeeklyInsightProGlassOverlay } from '@/components/weekly/WeeklyInsightProGlassOverlay'
import { cn } from '@/components/ui/utils'

const PRO_MARKDOWN_CLASS = 'leading-relaxed text-gray-900 dark:text-gray-100'

export type InsightPeriodTeaserLockProps = {
  message: string
  sharpPreviewChars?: number
  markdown?: boolean
  ctaLabel?: string
  ctaDescription: string
  ctaFooter?: ReactNode
  ctaHeadingId?: string
  className?: string
  onUpgradeClick?: () => void
}

export function InsightPeriodTeaserLock({
  message,
  sharpPreviewChars = TEASER_WEEKLY_REFLECTION_PREVIEW_CHARS,
  markdown = true,
  ctaLabel = 'Unlock Pro',
  ctaDescription,
  ctaFooter,
  ctaHeadingId,
  className,
  onUpgradeClick,
}: InsightPeriodTeaserLockProps) {
  const raw = message.trim()
  if (!raw) return null

  const { sharp, remainder } = markdown
    ? splitMarkdownTeaser(raw, sharpPreviewChars)
    : {
        sharp: raw.length <= sharpPreviewChars ? raw : raw.slice(0, sharpPreviewChars).trim(),
        remainder: raw.length <= sharpPreviewChars ? '' : raw.slice(sharpPreviewChars).trim(),
      }

  const lockedBody = remainder || (!sharp && raw)

  return (
    <div className={cn('space-y-3', className)}>
      {sharp ? (
        <div className="pointer-events-none select-none">
          {markdown ? (
            <MarkdownText className={PRO_MARKDOWN_CLASS}>{sharp}</MarkdownText>
          ) : (
            <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-gray-950 dark:text-gray-50">
              {sharp}
            </p>
          )}
        </div>
      ) : null}
      {lockedBody ? (
        <div
          className={cn(
            'relative isolate rounded-xl',
            ctaFooter ? 'min-h-[18rem] sm:min-h-[17rem]' : 'min-h-[11rem]'
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <div
              className={cn('h-full select-none', sharp ? 'mt-0' : '')}
              style={TEASER_MASK_STYLE}
            >
              <div className="blur-[2px]">
                {markdown ? (
                  <MarkdownText className={PRO_MARKDOWN_CLASS}>{remainder || raw}</MarkdownText>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                    {remainder || raw}
                  </p>
                )}
              </div>
            </div>
          </div>
          <WeeklyInsightProGlassOverlay
            headingId={ctaHeadingId}
            description={ctaDescription}
            ctaLabel={ctaLabel}
            footer={ctaFooter}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      ) : null}
    </div>
  )
}
