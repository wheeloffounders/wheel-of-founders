'use client'

import { usePathname } from 'next/navigation'
import { useProAccessBadgeLine } from '@/lib/hooks/useProAccessBadgeLine'

/**
 * Beta / trial countdown / expiration line between the Bauhaus strip and nav icons.
 */
export function ProAccessBadge() {
  const pathname = usePathname()
  const { label, pulse, uxStatus } = useProAccessBadgeLine()

  if (!label) return null

  /** Dashboard shows TrialExpiryBanner / wrap-up in-page; hide duplicate “trial ended” line above nav. */
  if (pathname === '/dashboard' && uxStatus === 'expired') return null

  return (
    <div className="max-w-4xl mx-auto px-3 pt-1.5 pb-1 text-center border-b border-gray-100/80 dark:border-gray-700/80">
      <p
        className={`text-[10px] leading-tight text-slate-500 dark:text-slate-400 tabular-nums ${
          pulse ? 'animate-pulse motion-reduce:animate-none' : ''
        }`}
      >
        {label}
      </p>
    </div>
  )
}
