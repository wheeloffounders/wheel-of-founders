'use client'

import { MicroLessonCard } from '@/components/MicroLessonCard'

export function EmptyEvening() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4">
      <p className="text-sm italic text-gray-600 dark:text-gray-300">
        No priorities planned for today. That&apos;s okay - you showed up and that matters.
      </p>
      <MicroLessonCard location="evening" compact className="mt-3" />
    </div>
  )
}
