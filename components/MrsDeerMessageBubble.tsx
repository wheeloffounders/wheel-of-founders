'use client'

import { MrsDeerAvatar, type Expression } from './MrsDeerAvatar'

interface MrsDeerMessageBubbleProps {
  children: React.ReactNode
  expression?: Expression
  /** Optional: override bubble styling (e.g. amber for emergency) */
  variant?: 'default' | 'emergency'
  className?: string
}

const colors = {
  coral: '#EF725C',
  amber: '#FBBF24',
  navy: '#152B50',
}

export function MrsDeerMessageBubble({
  children,
  expression = 'thoughtful',
  variant = 'default',
  className = '',
}: MrsDeerMessageBubbleProps) {
  const accentColor = variant === 'emergency' ? colors.amber : colors.coral

  return (
    <div
      className={`w-full overflow-visible border-2 border-[#152B50] dark:border-gray-600 ${className}`}
      style={{
        borderLeft: '4px solid ' + accentColor,
      }}
    >
      {/* Avatar INSIDE card at top left */}
      <div
        className={`flex justify-start p-4 pb-0 ${
          variant === 'emergency'
            ? 'bg-[#f8f4f0] dark:bg-amber-900/40'
            : 'bg-[#f8f4f0] dark:bg-amber-900/40'
        }`}
      >
        <MrsDeerAvatar
          expression={expression}
          size="mobile"
          className="md:hidden"
        />
        <MrsDeerAvatar
          expression={expression}
          size="large"
          className="hidden md:block"
        />
      </div>

      {/* Bubble - full width, yellow/beige, continues from avatar */}
      <div
        className={`relative w-full rounded-none p-5 pt-4 dark:border-t dark:border-gray-600 ${
          variant === 'emergency'
            ? 'bg-[#f8f4f0] dark:bg-amber-900/40'
            : 'bg-[#f8f4f0] dark:bg-amber-900/40'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
