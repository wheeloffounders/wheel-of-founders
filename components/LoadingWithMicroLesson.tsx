'use client'

import { useMicroLesson } from '@/lib/hooks/useMicroLesson'
import { Button } from '@/components/ui/button'
import { usePathname, useSearchParams } from 'next/navigation'

interface LoadingWithMicroLessonProps {
  message?: string
  onRetry?: () => void
  timeoutMs?: number
  className?: string
  location?: 'dashboard' | 'morning' | 'evening'
}

export function LoadingWithMicroLesson({
  message = 'Loading...',
  onRetry,
  timeoutMs = 8000,
  className = '',
  location = 'dashboard',
}: LoadingWithMicroLessonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { lesson } = useMicroLesson(location)
  const isOnboardingRoute = pathname?.startsWith('/onboarding')
  const isFirstTimeFlow = searchParams?.get('first') === 'true'
  const shouldHideMicroLesson = isOnboardingRoute || isFirstTimeFlow

  return (
    <div className={`flex flex-col items-center justify-center min-h-[300px] ${className}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ef725c] mb-3" />
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        This may take a moment on slow connections
      </p>
      {!shouldHideMicroLesson && lesson?.message ? (
        <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-3 text-center max-w-md px-4">
          {lesson.emoji ? `${lesson.emoji} ` : ''}
          {lesson.message}
        </p>
      ) : null}
      {onRetry ? (
        <div className="mt-5">
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  )
}

