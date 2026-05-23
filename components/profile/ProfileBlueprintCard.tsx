'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ProfileEditorialCard } from '@/components/profile/ProfileEditorialCard'
import {
  archetypeGradientRingClassName,
  patternsGradientRingClassName,
} from '@/lib/founder-dna/archetype-report-card-styles'
import {
  profileIdentityLeftAccentClassName,
  profileOperationalLeftAccentClassName,
  profileStrategicLeftAccentClassName,
  profileDossierSectionTitleClassName,
} from '@/lib/founder-dna/profile-dossier-styles'
import { cn } from '@/components/ui/utils'

export type ProfileBlueprintVariant = 'identity' | 'strategic' | 'operational'

const leftAccentByVariant: Record<ProfileBlueprintVariant, string> = {
  identity: profileIdentityLeftAccentClassName,
  strategic: profileStrategicLeftAccentClassName,
  operational: profileOperationalLeftAccentClassName,
}

type ProfileBlueprintCardProps = {
  variant: ProfileBlueprintVariant
  children: ReactNode
  innerClassName?: string
  pillarLabel?: string
  title?: string
  titleId?: string
  as?: 'article' | 'section' | 'div'
} & ComponentPropsWithoutRef<'article'>

export function ProfileBlueprintCard({
  variant,
  as: Tag = 'section',
  className,
  innerClassName,
  pillarLabel,
  title,
  titleId,
  children,
  ...props
}: ProfileBlueprintCardProps) {
  const gradientRing =
    variant === 'identity' ? archetypeGradientRingClassName : patternsGradientRingClassName

  return (
    <ProfileEditorialCard
      as={Tag}
      className={className}
      innerClassName={innerClassName}
      gradientRingClassName={gradientRing}
      leftAccentClassName={leftAccentByVariant[variant]}
      {...props}
    >
      {pillarLabel || title ? (
        <header className="relative z-10 mb-6 space-y-1">
          {pillarLabel ? (
            <p className={profileDossierSectionTitleClassName}>{pillarLabel}</p>
          ) : null}
          {title ? (
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          ) : null}
        </header>
      ) : null}
      <div className="relative z-10 min-w-0 space-y-6">{children}</div>
    </ProfileEditorialCard>
  )
}
