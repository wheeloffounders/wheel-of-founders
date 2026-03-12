'use client'

import * as React from 'react'
import { cn } from './utils'
import { colors } from '@/lib/design-tokens'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, highlighted = false, style, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)
    const baseStyle: React.CSSProperties = {
      borderRadius: 0,
      ...(highlighted && { borderLeft: `3px solid ${colors.coral.DEFAULT}` }),
      // Keep hover subtle: avoid transform changes that can cause "vibration"
      boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
      ...style,
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'card bg-white dark:bg-gray-800 dark:bg-gray-800 transition-all duration-200 border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700',
          className
        )}
        style={baseStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 px-4 md:px-5 py-4 md:py-5', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100 dark:text-white', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('card-content px-4 md:px-5 pb-4 md:pb-5 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center px-4 md:px-5 pb-4 md:pb-5 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
