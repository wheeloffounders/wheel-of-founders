'use client'

import Link from 'next/link'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { cn } from '@/components/ui/utils'

export type InsightUpgradeCtaButtonProps = {
  label: string
  onUpgradeClick?: () => void
  className?: string
}

/**
 * Freemium insight CTA — opens upgrade sheet when `onUpgradeClick` is set; otherwise links to pricing.
 */
export function InsightUpgradeCtaButton({ label, onUpgradeClick, className }: InsightUpgradeCtaButtonProps) {
  const classes = cn(viewProPlansCtaClassName, 'px-5 py-2.5 text-sm shadow-md', className)

  if (onUpgradeClick) {
    return (
      <button type="button" onClick={onUpgradeClick} className={classes}>
        {label}
      </button>
    )
  }

  return (
    <Link href="/pricing" className={classes}>
      {label}
    </Link>
  )
}
