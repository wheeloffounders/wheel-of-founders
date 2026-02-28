'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export type Expression = 'welcoming' | 'thoughtful' | 'encouraging' | 'celebratory' | 'empathetic'

interface MrsDeerAvatarProps {
  expression?: Expression
  size?: 'small' | 'medium' | 'mobile' | 'large' | 'hero'
  className?: string
}

const sizeMap = {
  small: { width: 40, height: 40, className: 'w-10 h-10' },
  medium: { width: 48, height: 48, className: 'w-12 h-12' },
  mobile: { width: 56, height: 56, className: 'w-14 h-14' },
  large: { width: 72, height: 72, className: 'w-[72px] h-[72px]' },
  hero: { width: 240, height: 240, className: 'w-60 h-60' },
}

// Different background colors for different expressions (Bauhaus style)
const expressionStyles = {
  welcoming: {
    bg: '#FFF0EC',
    accent: '#EF725C',
  },
  thoughtful: {
    bg: '#FFFBEB',
    accent: '#FBBF24',
  },
  encouraging: {
    bg: '#FFF0EC',
    accent: '#EF725C',
  },
  celebratory: {
    bg: '#ECFDF3',
    accent: '#22C55E',
  },
  empathetic: {
    bg: '#F0F4FF',
    accent: '#3B82F6',
  },
}

export function MrsDeerAvatar({
  expression = 'welcoming',
  size = 'medium',
  className = '',
}: MrsDeerAvatarProps) {
  const style = expressionStyles[expression]
  const sizeConfig = sizeMap[size]
  const prefersReducedMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Animation variants per expression
  const expressionAnimations = {
    welcoming: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 
1] as any  },
    },
    thoughtful: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] as any },
    },
    encouraging: {
      initial: { opacity: 0, y: -4 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any },
    },
    celebratory: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { 
        opacity: 1, 
        scale: 1,
      },
      transition: { 
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1] as any , // Bouncy ease for celebration
      },
    },
    empathetic: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any },
    },
  }

  const animation = expressionAnimations[expression]

  // Respect reduced motion preference
  const motionProps = prefersReducedMotion
    ? { initial: false, animate: false }
    : {
        initial: animation.initial,
        animate: isVisible ? animation.animate : animation.initial,
        transition: animation.transition,
      }

  return (
    <motion.div
      className={`relative ${sizeConfig.className} ${className}`}
      {...motionProps}
    >
      {/* Geometric background shape - Bauhaus style */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: style.bg }}
      />

      {/* Mrs. Deer image */}
      <Image
        src="/mrs-deer.png"
        alt="Mrs. Deer, your AI companion"
        width={sizeConfig.width}
        height={sizeConfig.height}
        className="relative z-10 w-full h-full object-contain p-1 rounded-full"
      />

      {/* Expression indicator - geometric accent */}
      {expression === 'celebratory' && !prefersReducedMotion && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full z-20"
            style={{ backgroundColor: '#FBBF24' }}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 z-20"
            style={{
              backgroundColor: '#22C55E',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

// Standalone expressions with descriptions for design system
export const MrsDeerExpressions = {
  welcoming: {
    name: 'Welcoming',
    description: 'Soft coral background, open and inviting',
    usage: 'Login, onboarding, first-time screens',
  },
  thoughtful: {
    name: 'Thoughtful',
    description: 'Warm amber background, reflective mood',
    usage: 'Morning planning, strategy questions',
  },
  encouraging: {
    name: 'Encouraging',
    description: 'Coral background with supportive presence',
    usage: 'Evening reflection, tough day check-ins',
  },
  celebratory: {
    name: 'Celebratory',
    description: 'Emerald background with geometric confetti accents',
    usage: 'Streaks, wins, shipping milestones',
  },
  empathetic: {
    name: 'Empathetic',
    description: 'Soft blue background, calming presence',
    usage: 'Emergency/low-energy days',
  },
} as const
