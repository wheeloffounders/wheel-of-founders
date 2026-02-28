'use client'

import { MrsDeerAvatar } from './MrsDeerAvatar'

interface StreamingIndicatorProps {
  /** Optional expression for Mrs. Deer (default: thoughtful) */
  expression?: 'welcoming' | 'thoughtful' | 'encouraging' | 'celebratory' | 'empathetic'
  /** Size of avatar */
  size?: 'small' | 'medium' | 'mobile' | 'large' | 'hero'
  className?: string
}

/**
 * Shows "Mrs. Deer is writing..." while streaming insight.
 * Use alongside MrsDeerMessageBubble when isStreaming is true.
 */
export function StreamingIndicator({
  expression = 'thoughtful',
  size = 'medium',
  className = '',
}: StreamingIndicatorProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <MrsDeerAvatar expression={expression} size={size} />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Mrs. Deer is writing...
        </span>
        <span className="inline-flex gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}
