'use client'

import { InsightUpgradeCtaButton } from '@/components/insights/InsightUpgradeCtaButton'
import { splitFirstParagraph } from '@/lib/insights/split-insight-paragraphs'
import { cn } from '@/components/ui/utils'

export type InsightPeriodFullHeightFadeProps = {
  body: string
  locked: boolean
  /** When set, used as sharp hook instead of first paragraph of `body`. */
  lead?: string
  ctaLabel?: string
  ctaDescription?: string
  ctaHeadingId?: string
  className?: string
  bodyClassName?: string
  onUpgradeClick?: () => void
}

/**
 * Full-height dynamic fade: first paragraph sharp, remainder native height + white gradient dissolve.
 */
export function InsightPeriodFullHeightFade({
  body,
  locked,
  lead: leadProp,
  ctaLabel = 'Unlock Pro',
  ctaDescription = 'Pro unlocks the full analysis built from your real founder rhythm.',
  ctaHeadingId,
  className,
  bodyClassName,
  onUpgradeClick,
}: InsightPeriodFullHeightFadeProps) {
  const { lead: leadFromBody, rest } = splitFirstParagraph(body)
  const lead = (leadProp ?? leadFromBody).trim()
  const headingId = ctaHeadingId ?? 'insight-full-height-fade-cta'

  if (!locked) {
    return (
      <div className={cn('space-y-4', className)}>
        {lead ? (
          <p className={cn('text-sm leading-relaxed text-gray-800 dark:text-gray-200', bodyClassName)}>{lead}</p>
        ) : null}
        {rest ? (
          <div className={cn('space-y-4 text-sm leading-relaxed text-gray-700 dark:text-gray-200', bodyClassName)}>
            {rest.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const lockedParagraphs = leadProp != null && leadProp !== '' ? body.trim() : rest.trim() || (lead ? '' : body.trim())
  if (!lead && !lockedParagraphs) return null

  return (
    <div className={cn('space-y-4', className)}>
      {lead ? (
        <p className="text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100">{lead}</p>
      ) : null}
      {lockedParagraphs ? (
        <div className={cn('relative', lead ? 'mt-1' : '')}>
          <div className={cn('space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-100', bodyClassName)}>
            {lockedParagraphs.split(/\n\n+/).map((para, i) => (
              <p key={i} className="pointer-events-none select-none blur-[2px]">
                {para}
              </p>
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-24 z-10 rounded-b-xl bg-gradient-to-b from-transparent via-white/90 to-white backdrop-blur-sm dark:via-gray-800/90 dark:to-gray-800/95"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 top-24 z-20 flex items-center justify-center px-4 py-8">
            {onUpgradeClick ? (
              <InsightUpgradeCtaButton label={ctaLabel} onUpgradeClick={onUpgradeClick} />
            ) : (
              <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-slate-200/70 bg-white/95 px-5 py-4 text-center shadow-lg dark:border-slate-600/60 dark:bg-gray-900/95">
                <p
                  id={headingId}
                  className="text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
                >
                  {ctaDescription}
                </p>
                <InsightUpgradeCtaButton label={ctaLabel} />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
