'use client'

import { useEffect, useState } from 'react'
import { useMicroLesson } from '@/lib/hooks/useMicroLesson'

export function PullToRefresh() {
  const { lesson } = useMicroLesson('dashboard')
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  useEffect(() => {
    let startY: number | null = null

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0) {
        startY = null
        return
      }
      startY = event.touches[0]?.clientY ?? null
    }

    const onTouchMove = (event: TouchEvent) => {
      if (startY === null) return
      if (window.scrollY > 0) {
        setIsPulling(false)
        setPullDistance(0)
        return
      }

      const currentY = event.touches[0]?.clientY ?? startY
      const distance = Math.max(0, currentY - startY)
      setPullDistance(distance)
      setIsPulling(distance > 0)
    }

    const onTouchEnd = () => {
      startY = null
      setIsPulling(false)
      setPullDistance(0)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  if (!isPulling || pullDistance <= 30) return null

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-10 flex justify-center pt-1">
      <span className="rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm px-3 py-1 text-xs text-gray-500 dark:text-gray-400 shadow-sm">
        {lesson?.message ?? 'Pull to refresh'}
      </span>
    </div>
  )
}
