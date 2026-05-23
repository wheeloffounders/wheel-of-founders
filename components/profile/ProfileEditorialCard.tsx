'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/components/ui/utils'
import {
  profileStationeryCardInnerClassName,
  profileStationeryCardStyle,
  profileStationeryCardStyleDark,
} from '@/lib/founder-dna/profile-dossier-styles'

type ProfileEditorialCardProps = {
  as?: 'article' | 'div' | 'section' | 'nav'
  children: ReactNode
  innerClassName?: string
  gradientRingClassName: string
  leftAccentClassName: string
} & ComponentPropsWithoutRef<'article'>

/** Profile dossier shell — gradient ring, pinstripe interior, left accent (no blueprint dots). */
export function ProfileEditorialCard({
  as: Tag = 'article',
  className,
  innerClassName,
  gradientRingClassName,
  leftAccentClassName,
  children,
  ...props
}: ProfileEditorialCardProps) {
  return (
    <Tag className={cn(gradientRingClassName, className)} {...props}>
      <div className={cn(profileStationeryCardInnerClassName, innerClassName)}>
        <div
          className="pointer-events-none absolute inset-0 z-0 dark:hidden"
          style={profileStationeryCardStyle}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
          style={profileStationeryCardStyleDark}
          aria-hidden
        />
        <div className={leftAccentClassName} aria-hidden />
        <div className="relative z-10 min-w-0">{children}</div>
      </div>
    </Tag>
  )
}
