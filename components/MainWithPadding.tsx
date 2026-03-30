'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const NO_TOP_PADDING_PATHS = ['/morning', '/evening', '/emergency', '/history']

/**
 * Morning / Evening / Emergency / History use a flush top (colored header or full-height sidebar);
 * skip default main top padding so there is no gap under the status bar.
 */
export function MainWithPadding({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const flushTop = pathname ? NO_TOP_PADDING_PATHS.includes(pathname) : false

  return (
    <main className={flushTop ? 'min-h-screen pb-24 pt-0' : 'min-h-screen pt-4 pb-24'}>{children}</main>
  )
}
