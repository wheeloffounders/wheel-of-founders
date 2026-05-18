'use client'

import {
  buildArchetypeDiagnosisFreemiumFallback,
  buildArchetypeDiagnosisFreemiumHook,
} from '@/lib/founder-dna/archetype-diagnosis-copy'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { cn } from '@/components/ui/utils'

export type ArchetypeDiagnosisSummaryProps = {
  explanation: string
  primaryLabel: string
  strongestSignalName: string | null | undefined
  locked: boolean
  onUpgradeClick?: () => void
  className?: string
}

const UPGRADE_INLINE_LABEL = '🔒 Unlock Pro to read your Growth Edge and 30-Day Action Blueprint'

/**
 * Archetype diagnosis paragraph under "Your Archetype Was Determined By".
 */
export function ArchetypeDiagnosisSummary({
  explanation,
  primaryLabel,
  strongestSignalName,
  locked,
  onUpgradeClick,
  className,
}: ArchetypeDiagnosisSummaryProps) {
  if (!locked) {
    return (
      <p className={cn('text-sm text-gray-600 dark:text-gray-300 leading-relaxed', className)}>
        {explanation}
      </p>
    )
  }

  const usesStandardTemplate = explanation.includes('Mrs. Deer sees you as a')
  const { lead, fadeTail } = usesStandardTemplate
    ? buildArchetypeDiagnosisFreemiumHook(primaryLabel, strongestSignalName)
    : buildArchetypeDiagnosisFreemiumFallback(primaryLabel)

  return (
    <div className={cn('flex flex-col items-center gap-2.5', className)}>
      <p className="w-full text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <span className="text-gray-800 dark:text-gray-100">{lead}</span>
        <span className="bg-gradient-to-r from-slate-800 via-slate-600/70 to-transparent bg-clip-text text-transparent dark:from-slate-200 dark:via-slate-400/70">
          {fadeTail}
        </span>
      </p>
      <button
        type="button"
        onClick={onUpgradeClick}
        className={cn(viewProPlansCtaClassName, 'mx-auto max-w-md px-5 py-2.5 text-center text-xs leading-snug sm:text-sm')}
      >
        {UPGRADE_INLINE_LABEL}
      </button>
    </div>
  )
}

