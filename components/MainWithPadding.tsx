'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const NO_TOP_PADDING_PREFIXES = ['/morning', '/evening', '/emergency', '/history'] as const

/**
 * Morning / Evening / Emergency / History use a flush top (colored header or full-height sidebar);
 * skip default main top padding so there is no gap under the status bar.
 * Includes freemium audit routes (`/morning/free`, `/emergency/free`).
 */
export function MainWithPadding({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const flushTop = pathname
    ? NO_TOP_PADDING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    : false

  const morningSurface =
    pathname && (pathname === '/morning' || pathname.startsWith('/morning/'))
      ? 'bg-[#f8f9fa] dark:bg-slate-950'
      : ''

  return (
    <main
      className={`${flushTop ? 'min-h-screen pb-24 pt-0' : 'min-h-screen pt-4 pb-24'} ${morningSurface}`}
    >
      {children}
    </main>
  )
}
