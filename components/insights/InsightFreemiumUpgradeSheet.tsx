'use client'

import { EmergencyUpgradeBottomSheet } from '@/components/emergency/EmergencyUpgradeBottomSheet'

export type InsightFreemiumUpgradeSheetProps = {
  open: boolean
  onClose: () => void
  titleId?: string
  title?: string
  description?: string
  primaryLabel?: string
  secondaryLabel?: string
}

const DEFAULT_TITLE_ID = 'insight-freemium-upgrade-title'

/**
 * Shared Pro upgrade drawer for weekly / monthly / quarterly / Founder DNA freemium surfaces.
 */
export function InsightFreemiumUpgradeSheet({
  open,
  onClose,
  titleId = DEFAULT_TITLE_ID,
  title = 'Unlock Pro insights',
  description = 'Upgrade for Mrs. Deer’s full synthesis — growth edges, pattern spotlights, and period blueprints built from your real founder rhythm.',
  primaryLabel = 'Upgrade to Annual — $29/mo',
  secondaryLabel = 'Keep exploring the preview',
}: InsightFreemiumUpgradeSheetProps) {
  return (
    <EmergencyUpgradeBottomSheet
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      description={description}
      primaryLabel={primaryLabel}
      secondaryLabel={secondaryLabel}
    />
  )
}
