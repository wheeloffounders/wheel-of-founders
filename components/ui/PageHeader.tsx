'use client'

import type { ReactNode } from 'react'
import { Calendar } from 'lucide-react'

export type PageHeaderVariant = 'morning' | 'evening' | 'emergency'

const BG: Record<PageHeaderVariant, string> = {
  morning: 'bg-[#ef725c]',
  evening: 'bg-[#152b50]',
  emergency: 'bg-[#f59e0b]',
}

/** Solid hex for inline styles — reliable paint edge-to-edge with env() padding */
const BG_HEX: Record<PageHeaderVariant, string> = {
  morning: '#ef725c',
  evening: '#152b50',
  emergency: '#f59e0b',
}

interface PageHeaderProps {
  variant: PageHeaderVariant
  title: string
  /** e.g. emoji + space or icon */
  titleIcon?: ReactNode
  subtitle: string
  onCalendarClick: () => void
}

export function PageHeader({ variant, title, titleIcon, subtitle, onCalendarClick }: PageHeaderProps) {
  const bg = BG[variant]
  const hex = BG_HEX[variant]

  return (
    <div
      className={`page-header-bleed w-screen relative left-1/2 -translate-x-1/2 z-[5] ${bg}`}
      data-page-header={variant}
      style={{ backgroundColor: hex }}
    >
      <div className="max-w-3xl mx-auto px-4 pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-white flex items-center gap-2 min-w-0">
              {titleIcon ? <span className="shrink-0">{titleIcon}</span> : null}
              <span className="truncate">{title}</span>
            </h1>
            <p className="text-white/85 text-sm mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCalendarClick}
            className="shrink-0 flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2 text-white transition-colors"
            aria-label="Pick a date"
          >
            <Calendar className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-sm font-medium whitespace-nowrap">Pick a date</span>
          </button>
        </div>
      </div>
    </div>
  )
}
