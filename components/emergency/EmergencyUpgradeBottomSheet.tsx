'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PRO_GATE_BADGE_SURFACE_CLASS } from '@/lib/morning/pro-gate-badge-styles'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

type EmergencyUpgradeBottomSheetProps = {
  open: boolean
  onClose: () => void
  titleId: string
  title: string
  description: string
  primaryLabel?: string
  secondaryLabel?: string
}

/**
 * Slide-up upgrade sheet — portaled above bottom nav; keeps founders on Emergency during a crisis.
 */
export function EmergencyUpgradeBottomSheet({
  open,
  onClose,
  titleId,
  title,
  description,
  primaryLabel = 'Upgrade to Annual — $29/mo',
  secondaryLabel = "I'll keep typing manually",
}: EmergencyUpgradeBottomSheetProps) {
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !portalReady) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:items-center sm:pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md max-h-[min(85vh,calc(100svh-6rem-env(safe-area-inset-bottom,0px)))] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-600 dark:bg-gray-900 sm:rounded-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <span className={PRO_GATE_BADGE_SURFACE_CLASS}>Pro</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        <motion.div
          className="mt-5 flex flex-col gap-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Link
            href="/pricing"
            className={`w-full text-center ${viewProPlansCtaClassName}`}
            onClick={onClose}
          >
            {primaryLabel}
          </Link>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full whitespace-normal px-4 py-2.5 text-center text-sm leading-snug"
            onClick={onClose}
          >
            {secondaryLabel}
          </Button>
        </motion.div>
      </motion.div>
    </div>,
    document.body
  )
}
