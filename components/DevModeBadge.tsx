'use client'

/**
 * DevModeBadge - Shows "DEV MODE" indicator in development only.
 * Yellow background, black text. Fixed position, top-right.
 */
import { isDevelopment } from '@/lib/env'

export function DevModeBadge() {
  if (!isDevelopment) return null

  return (
    <div
      className="fixed right-4 top-4 z-[9998] px-3 py-1 text-xs font-bold"
      style={{ backgroundColor: '#FBBF24', color: '#000' }}
      aria-label="Development mode"
    >
      DEV MODE
    </div>
  )
}
