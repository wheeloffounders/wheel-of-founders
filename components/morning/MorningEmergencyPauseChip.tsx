'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

const DISMISS_KEY = 'wof_morning_emergency_pause_chip_dismissed'

type MorningEmergencyPauseChipProps = {
  visible: boolean
}

/**
 * Dismissible nudge when a Hot fire is active and grayscale focus mode is Pro-only.
 */
export function MorningEmergencyPauseChip({ visible }: MorningEmergencyPauseChipProps) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!visible) {
      setDismissed(true)
      return
    }
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [visible])

  if (!visible || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <motion.div
      className="mb-4 flex flex-wrap items-start gap-2 rounded-xl border border-[#152b50]/25 bg-white px-3 py-2.5 shadow-sm dark:border-sky-800/40 dark:bg-gray-900/80"
      role="status"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="min-w-0 flex-1 text-sm leading-snug text-gray-800 dark:text-gray-200">
        <span className="font-medium text-gray-900 dark:text-white">Visual focus mode</span> (grayscale) is a Pro
        feature to protect your peace while the fire is hot.{' '}
        <Link
          href="/pricing"
          className="font-semibold text-[#152b50] underline-offset-2 hover:underline dark:text-sky-300"
        >
          See how it works
        </Link>
      </p>
      <motion.div className="flex shrink-0 items-center gap-1.5">
        <Link href="/pricing" className={`${viewProPlansCtaClassName} px-3 py-1.5 text-xs`}>
          Upgrade
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </motion.div>
    </motion.div>
  )
}
