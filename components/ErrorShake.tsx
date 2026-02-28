'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ErrorShakeProps {
  children: ReactNode
  trigger?: boolean
}

export function ErrorShake({ children, trigger }: ErrorShakeProps) {
  return (
    <motion.div
      animate={trigger ? {
        x: [0, -10, 10, -10, 10, 0],
      } : {}}
      transition={{
        duration: 0.5,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  )
}
