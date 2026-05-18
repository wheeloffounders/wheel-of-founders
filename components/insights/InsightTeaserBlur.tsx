'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MarkdownText } from '@/components/MarkdownText'
import { ProGateInsightCta } from '@/components/pro/ProGateInsightCta'
import { cn } from '@/components/ui/utils'

export const TEASER_SHARP_PREVIEW_CHARS = 120

/** Weekly reflection card — one extra sharp line vs morning / plan-review teaser. */
export const TEASER_WEEKLY_REFLECTION_PREVIEW_CHARS = 195

export const TEASER_MASK_STYLE = {
  maskImage: 'linear-gradient(to bottom, black 20%, transparent 90%)',
  WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 90%)',
} as const

const DEFAULT_FADE =
  'from-amber-50/95 via-amber-50/40 to-transparent dark:from-amber-950/70 dark:via-amber-950/30 dark:to-transparent'

/** Pro weekly / morning synthesis markdown — same typography as unlocked insight cards. */
const PRO_MARKDOWN_CLASS = 'leading-relaxed text-gray-900 dark:text-gray-100'

const TEASER_MARKDOWN_CLASS =
  'text-sm leading-relaxed text-gray-900 dark:text-gray-100 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_p]:leading-relaxed'

export type InsightTeaserCtaVariant = 'pill' | 'proGate'

export type InsightTeaserBlurProps = {
  /** Full insight body (plain text or markdown). */
  message: string
  ctaLabel?: string
  ctaHref?: string
  sharpPreviewChars?: number
  /** Render sharp + blurred remainder as markdown (weekly AI synthesis). */
  markdownRemainder?: boolean
  className?: string
  /** Tailwind gradient stops for bottom fade (match parent card surface). */
  fadeGradientClass?: string
  /** `proGate` — navy dotted card + lock + brand gradient button (weekly / brain-dump parity). */
  ctaVariant?: InsightTeaserCtaVariant
  /** Required when `ctaVariant="proGate"`. */
  ctaDescription?: string
  ctaFooter?: ReactNode
  ctaHeadingId?: string
}

/**
 * Prefer splitting after the first heading + paragraph so freemium matches Pro layout.
 */
export function splitMarkdownTeaser(source: string, maxChars: number): { sharp: string; remainder: string } {
  const raw = source.trim()
  if (!raw) return { sharp: '', remainder: '' }
  if (raw.length <= maxChars) return { sharp: raw, remainder: '' }

  const blocks = raw.split(/\n\n+/)
  if (blocks.length >= 2) {
    const twoBlocks = blocks.slice(0, 2).join('\n\n')
    if (twoBlocks.length <= Math.max(maxChars, Math.floor(maxChars * 1.25))) {
      const rest = blocks.slice(2).join('\n\n').trim()
      return { sharp: twoBlocks, remainder: rest }
    }
  }

  let splitAt = raw.lastIndexOf('\n\n', maxChars)
  if (splitAt === -1 || splitAt < Math.floor(maxChars * 0.35)) {
    splitAt = maxChars
  }

  return {
    sharp: raw.slice(0, splitAt).trimEnd(),
    remainder: raw.slice(splitAt).trimStart(),
  }
}

/**
 * Morning insight “Tease & Convert” — sharp preview + blurred remainder + upgrade CTA.
 * Weekly markdown uses the same MarkdownText rendering as the Pro card.
 */
export function InsightTeaserBlur({
  message,
  ctaLabel = 'Unlock Full Strategic Review',
  ctaHref = '/pricing',
  sharpPreviewChars = TEASER_SHARP_PREVIEW_CHARS,
  markdownRemainder = false,
  className,
  fadeGradientClass = DEFAULT_FADE,
  ctaVariant = 'pill',
  ctaDescription,
  ctaFooter,
  ctaHeadingId,
}: InsightTeaserBlurProps) {
  const useProGateCta = ctaVariant === 'proGate'
  const raw = (message ?? '').trim()
  if (!raw) return null

  const { sharp, remainder } = markdownRemainder
    ? splitMarkdownTeaser(raw, sharpPreviewChars)
    : {
        sharp: raw.length <= sharpPreviewChars ? raw : raw.slice(0, sharpPreviewChars).trim(),
        remainder: raw.length <= sharpPreviewChars ? '' : raw.slice(sharpPreviewChars).trim(),
      }

  const hasRemainder = remainder.length > 0
  const allBlurred = markdownRemainder ? !sharp && !!raw : raw.length <= sharpPreviewChars

  return (
    <div
      className={cn(
        'relative isolate min-h-[176px] overflow-hidden rounded-xl',
        useProGateCta ? 'pb-2' : 'pb-16',
        className
      )}
      role="region"
      aria-label="Pro insight preview"
    >
      {allBlurred ? (
        <div
          className="pointer-events-none select-none overflow-hidden rounded-md"
          style={TEASER_MASK_STYLE}
        >
          <div className="blur-[2px]">
            {markdownRemainder ? (
              <MarkdownText className={PRO_MARKDOWN_CLASS}>{raw}</MarkdownText>
            ) : (
              <p className="text-sm font-medium leading-relaxed text-gray-950 dark:text-gray-50 whitespace-pre-wrap">
                {raw}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {sharp ? (
            <div className="pointer-events-none select-none">
              {markdownRemainder ? (
                <MarkdownText className={PRO_MARKDOWN_CLASS}>{sharp}</MarkdownText>
              ) : (
                <p className="text-sm font-medium leading-relaxed text-gray-950 dark:text-gray-50">
                  {sharp}
                  {!hasRemainder ? null : '…'}
                </p>
              )}
            </div>
          ) : null}
          {hasRemainder ? (
            <div
              className={cn('relative overflow-hidden rounded-md', sharp ? 'mt-2 max-h-[7.5rem]' : 'max-h-[10rem]')}
              style={TEASER_MASK_STYLE}
            >
              <div className="blur-[2px] select-none pointer-events-none text-gray-900 dark:text-gray-100">
                {markdownRemainder ? (
                  <MarkdownText className={PRO_MARKDOWN_CLASS}>{remainder}</MarkdownText>
                ) : (
                  <p className={cn('whitespace-pre-wrap', TEASER_MARKDOWN_CLASS)}>{remainder}</p>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
      {useProGateCta ? (
        <>
          {hasRemainder || allBlurred ? (
            <div className={cn('pointer-events-none mt-3 h-10 bg-gradient-to-t', fadeGradientClass)} aria-hidden />
          ) : null}
          <ProGateInsightCta
            className="relative z-20 mt-2"
            headingId={ctaHeadingId}
            description={
              ctaDescription ??
              'Mrs. Deer connects the dots between your startup metrics, your daily energy, and parenting milestones to reveal the patterns hidden in your busy weeks.'
            }
            ctaLabel={ctaLabel}
            ctaHref={ctaHref}
            footer={ctaFooter}
          />
        </>
      ) : (
        <>
          <div
            className={cn('pointer-events-none absolute inset-x-0 bottom-12 h-14 bg-gradient-to-t', fadeGradientClass)}
            aria-hidden
          />
          <div className="absolute inset-x-3 bottom-2 z-20 flex justify-center">
            <Link
              href={ctaHref}
              className={cn(
                'pointer-events-auto inline-flex max-w-[min(100%,22rem)] items-center justify-center rounded-full border border-amber-400/50',
                'bg-gradient-to-r from-amber-100/95 via-white/92 to-amber-50/95 px-4 py-2.5 text-center text-xs font-semibold leading-snug text-amber-950',
                'shadow-lg shadow-amber-900/10 backdrop-blur-md ring-1 ring-amber-300/55 transition',
                'hover:border-amber-500/60 hover:from-amber-50 hover:to-white hover:ring-amber-400/70',
                'dark:border-amber-500/35 dark:from-amber-950/88 dark:via-violet-950/45 dark:to-amber-950/75 dark:text-amber-50',
                'dark:shadow-black/40 dark:ring-amber-400/20 dark:hover:from-amber-900/92 dark:hover:to-violet-950/55',
              )}
            >
              {ctaLabel}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
