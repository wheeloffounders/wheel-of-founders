'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SuccessCheckmark({ size = 'md', className = '' }: SuccessCheckmarkProps) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  return (
    <motion.div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: colors.emerald.DEFAULT }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
    >
      <motion.div
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          delay: 0.2,
          duration: 0.4,
          ease: 'easeOut',
        }}
      >
        <Check className="w-1/2 h-1/2 text-white" strokeWidth={3} />
      </motion.div>
    </motion.div>
  )
}
