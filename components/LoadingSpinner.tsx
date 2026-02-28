'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MrsDeerAvatar } from './MrsDeerAvatar'
import { Button } from './ui/button'

interface LoadingSpinnerProps {
  message?: string
  showMrsDeer?: boolean
  onRetry?: () => void
  timeoutMs?: number
}

export function LoadingSpinner({ message = 'Loading...', showMrsDeer = true, onRetry, timeoutMs = 8000 }: LoadingSpinnerProps) {
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    if (!onRetry) return
    const timer = setTimeout(() => setShowRetry(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [onRetry, timeoutMs])
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      {showMrsDeer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <MrsDeerAvatar expression="thoughtful" size="large" />
          </motion.div>
        </motion.div>
      )}
      
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-[#EF725C]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-[#EF725C]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-[#EF725C]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.4,
          }}
        />
      </motion.div>
      
      {message && (
        <motion.p
          className="text-sm text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>
      )}
      {showRetry && onRetry && (
        <motion.div
          className="mt-6 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-gray-500 dark:text-gray-500">Taking longer than expected?</p>
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </motion.div>
      )}
    </div>
  )
}
