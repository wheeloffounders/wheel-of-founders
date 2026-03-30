'use client'

type FounderDnaNextUpdateHintProps = {
  /** e.g. "Tuesday" / "Wednesday" */
  cadenceLabel: string
  nextUpdate?: string | null
}

/** Shown under Founder DNA feature cards when the API returns refresh metadata. */
export function FounderDnaNextUpdateHint({ cadenceLabel, nextUpdate }: FounderDnaNextUpdateHintProps) {
  if (!nextUpdate) return null
  return (
    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2" data-founder-dna-next-update>
      <span aria-hidden>✨</span> Updates every {cadenceLabel} (your timezone) · Next update: {nextUpdate}
    </p>
  )
}
