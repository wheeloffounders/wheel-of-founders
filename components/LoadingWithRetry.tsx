'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'

interface LoadingWithRetryProps {
  message?: string
  onRetry: () => void
  timeoutMs?: number
  className?: string
}

export function LoadingWithRetry({
  message = 'Loading...',
  onRetry,
  timeoutMs = 8000,
  className = '',
}: LoadingWithRetryProps) {
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetry(true)
    }, timeoutMs)
    return () => clearTimeout(timer)
  }, [timeoutMs])

  const handleRetry = () => {
    setShowRetry(false)
    onRetry()
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}
    >
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
        style={{ borderColor: colors.coral.DEFAULT }}
      />
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
      <p className="text-xs mt-2 text-gray-600 dark:text-gray-300">
        This may take a moment on slow connections
      </p>
      {showRetry && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Taking longer than expected?
          </p>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
