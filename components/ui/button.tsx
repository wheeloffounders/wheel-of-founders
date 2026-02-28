'use client'

import * as React from 'react'
import { cn } from './utils'
import { colors } from '@/lib/design-tokens'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'coral' | 'amber' | 'navy' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, style, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-none font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: colors.coral.DEFAULT,
        color: '#FFFFFF',
        border: `2px solid ${colors.coral.hover}`,
      },
      secondary: {
        backgroundColor: colors.navy.DEFAULT,
        color: '#FFFFFF',
        border: `2px solid ${colors.navy.hover}`,
      },
      coral: {
        backgroundColor: colors.coral.DEFAULT,
        color: '#FFFFFF',
        border: `2px solid ${colors.coral.hover}`,
      },
      amber: {
        backgroundColor: colors.amber.DEFAULT,
        color: '#FFFFFF',
        border: `2px solid #D97706`,
      },
      navy: {
        backgroundColor: colors.navy.DEFAULT,
        color: '#FFFFFF',
        border: `2px solid ${colors.navy.hover}`,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.navy.DEFAULT,
        border: '2px solid transparent',
      },
      outline: {
        backgroundColor: colors.neutral.card,
        color: colors.navy.DEFAULT,
        border: `2px solid ${colors.navy.DEFAULT}`,
      },
      danger: {
        backgroundColor: '#DC2626',
        color: '#FFFFFF',
        border: '2px solid #B91C1C',
      },
    }
    
    const hoverStyles: Record<string, React.CSSProperties> = {
      primary: { backgroundColor: colors.coral.hover },
      secondary: { backgroundColor: colors.navy.hover },
      coral: { backgroundColor: colors.coral.hover },
      amber: { backgroundColor: '#D97706' },
      navy: { backgroundColor: colors.navy.hover },
      ghost: { backgroundColor: colors.neutral.background },
      outline: { backgroundColor: colors.neutral.background },
      danger: { backgroundColor: '#B91C1C' },
    }
    
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-6 text-base',
      lg: 'h-12 px-8 text-lg',
    }

    const [isHovered, setIsHovered] = React.useState(false)
    const [isActive, setIsActive] = React.useState(false)
    const v = variant

    const buttonStyle: React.CSSProperties = {
      ...variantStyles[v],
      ...(isHovered && hoverStyles[v]),
      ...(isActive && { transform: 'scale(0.98)' }),
      transition: 'all 0.2s ease',
      ...style,
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizeStyles[size], className)}
        style={buttonStyle}
        disabled={isLoading || props.disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        {...props}
      >
        {isLoading && <span className="mr-2 animate-spin">⏳</span>}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
