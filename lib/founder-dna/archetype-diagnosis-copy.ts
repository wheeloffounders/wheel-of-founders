/** Pro-only tail markers — must never reach the DOM when freemium locks diagnosis copy. */
const PRO_DIAGNOSIS_MARKERS = ['Growth edge:', 'Next 30 days:'] as const

export function diagnosisContainsProStrategy(text: string): boolean {
  return PRO_DIAGNOSIS_MARKERS.some((m) => text.includes(m))
}

/**
 * Freemium cliffhanger — ends after archetype + strongest signal identification.
 * Does not include pattern-emergence, growth edge, or 30-day blueprint copy.
 */
export function buildArchetypeDiagnosisFreemiumHook(
  primaryLabel: string,
  strongestSignalName: string | null | undefined
): { lead: string; fadeTail: string } {
  const label = primaryLabel.trim() || 'Founder'
  const lead = strongestSignalName
    ? `Mrs. Deer sees you as a ${label} because your strongest signal comes from `
    : `Mrs. Deer sees you as a ${label} because your strongest signal comes from`
  const fadeTail = strongestSignalName
    ? `${strongestSignalName.trim().toLowerCase()}...`
    : '...'
  return { lead, fadeTail }
}

/** Fallback when explanation does not match the standard Mrs. Deer template. */
export function buildArchetypeDiagnosisFreemiumFallback(primaryLabel: string): { lead: string; fadeTail: string } {
  const label = primaryLabel.trim() || 'Founder'
  return {
    lead: `Mrs. Deer sees you as a ${label} because your strongest signal comes from `,
    fadeTail: 'your live founder rhythm...',
  }
}

/**
 * Strip pro strategy tails if parsing legacy/full explanation strings server-side.
 */
export function stripProDiagnosisTail(text: string): string {
  let cut = text.length
  for (const marker of PRO_DIAGNOSIS_MARKERS) {
    const idx = text.indexOf(marker)
    if (idx >= 0) cut = Math.min(cut, idx)
  }
  const emergingIdx = text.indexOf('The pattern is emerging now')
  if (emergingIdx >= 0) cut = Math.min(cut, emergingIdx)
  return text.slice(0, cut).trimEnd()
}
