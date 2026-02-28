'use client'

import { motion } from 'framer-motion'
import { colors } from '@/lib/design-tokens'

interface ProgressIndicatorProps {
  current: number
  total: number
  className?: string
}

export function ProgressIndicator({ current, total, className = '' }: ProgressIndicatorProps) {
  const progress = Math.min((current / total) * 100, 100)

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index < current
        const isCurrent = index === current - 1

        return (
          <motion.div
            key={index}
            className={`w-3 h-3 rounded-full border-2`}
            style={{
              backgroundColor: isActive ? colors.coral.DEFAULT : 'transparent',
              borderColor: colors.navy.DEFAULT,
            }}
            initial={false}
            animate={{
              scale: isCurrent ? 1.2 : 1,
              opacity: isActive ? 1 : 0.3,
            }}
            transition={{ duration: 0.3 }}
          />
        )
      })}
    </div>
  )
}
