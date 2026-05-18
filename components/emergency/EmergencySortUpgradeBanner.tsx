'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { MORNING_BLUEPRINTS_SUBCARD_CLASS } from '@/lib/morning/morning-loop-card-styles'

type EmergencySortUpgradeBannerProps = {
  reading?: boolean
  onQuickSort: () => void
  onDismiss?: () => void
}

/**
 * Finish & Sort — freemium choice after vent (Peak Relief moment).
 */
export function EmergencySortUpgradeBanner({
  reading = false,
  onQuickSort,
  onDismiss,
}: EmergencySortUpgradeBannerProps) {
  if (reading) {
    return (
      <div
        className={`mx-4 mb-4 mt-2 md:mx-5 ${MORNING_BLUEPRINTS_SUBCARD_CLASS}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-[#152b50] dark:text-sky-200/90">Mrs. Deer is reading…</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Listening for the heat and a clear headline in your vent.
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/60" aria-hidden>
          <motion.div
            className="h-full w-2/5 rounded-full bg-sky-500/70"
            animate={{ x: ['-20%', '120%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={`mx-4 mb-4 mt-2 md:mx-5 ${MORNING_BLUEPRINTS_SUBCARD_CLASS}`}
      role="region"
      aria-labelledby="emergency-sort-upgrade-heading"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <p id="emergency-sort-upgrade-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
          Mrs. Deer can name this fire and triage its heat for you.
        </p>
      </motion.div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Pro sorting turns your vent into a headline and severity. Or use quick sort — keyword-based, always free.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href="/pricing" className={`sm:flex-1 text-center ${viewProPlansCtaClassName}`} onClick={onDismiss}>
          Unlock Pro sorting
        </Link>
        <Button type="button" variant="outline" className="sm:flex-1" onClick={onQuickSort}>
          Continue with quick sort (free)
        </Button>
      </div>
    </motion.div>
  )
}
