'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/preview-events'

type GuestPreviewModalProps = {
  open: boolean
  featureName: string
  title: string
  description: string
  ctaLabel?: string
  targetUrl?: string
  onClose: () => void
}

export function GuestPreviewModal({
  open,
  featureName,
  title,
  description,
  ctaLabel = 'Enter the App',
  targetUrl = '/auth',
  onClose,
}: GuestPreviewModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close preview modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-[#eaddd7] bg-[#fdfcfb] p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ef725c]">Feature preview</p>
        <h3 className="mt-2 text-xl font-bold text-[#152b50]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#4a4a4a]">{description}</p>
        <div className="mt-5 flex items-center gap-3">
          <Link
            href={targetUrl}
            onClick={() => {
              trackEvent('preview_cta_clicked', { feature: featureName, target: targetUrl })
              onClose()
            }}
            className="inline-flex rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#e8654d]"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[#4a4a4a] underline-offset-2 hover:underline"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
