'use client'

import Link from 'next/link'
import { MicroLessonCard } from '@/components/MicroLessonCard'

interface EmptyStateProps {
  message: string
  ctaLabel?: string
  ctaHref?: string
}

export function EmptyState({ message, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <MicroLessonCard location="dashboard" compact className="mt-3" />
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="inline-block mt-3 text-sm text-[#ef725c] hover:underline">
          {ctaLabel} →
        </Link>
      ) : null}
    </div>
  )
}
