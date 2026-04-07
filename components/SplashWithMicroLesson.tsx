'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMicroLesson } from '@/lib/hooks/useMicroLesson'

const SPLASH_KEY = 'has_seen_splash'

export function SplashWithMicroLesson() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { lesson } = useMicroLesson('dashboard')
  const [visible, setVisible] = useState(false)
  const isOnboardingRoute = pathname?.startsWith('/onboarding')
  const isFirstTimeFlow = searchParams?.get('first') === 'true'

  useEffect(() => {
    if (pathname?.startsWith('/auth') || isOnboardingRoute || isFirstTimeFlow) return
    const seen = typeof window !== 'undefined' && window.localStorage.getItem(SPLASH_KEY) === 'true'
    if (!seen) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        window.localStorage.setItem(SPLASH_KEY, 'true')
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [pathname, isOnboardingRoute, isFirstTimeFlow])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => {
        setVisible(false)
        window.localStorage.setItem(SPLASH_KEY, 'true')
      }}
      className="fixed inset-0 z-[60] bg-white/92 dark:bg-gray-900/92 backdrop-blur-sm flex items-center justify-center p-6"
      aria-label="Dismiss micro lesson splash"
    >
      <div className="text-center max-w-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {lesson?.emoji ? `${lesson.emoji} ` : ''}{lesson?.message ?? 'Welcome back. Small steps compound.'}
        </p>
      </div>
    </button>
  )
}

