import { splitFirstParagraph } from '@/lib/insights/split-insight-paragraphs'
import type { ArchetypeEvolutionHistoryEntry } from '@/lib/types/founder-dna'

type PersonalityProfileSlice = {
  description: string
  recentExampleBox: {
    date: string
    headline: string
    example: string
    interpretation: string
  }
  keyCharacteristics: string[]
  strengths: string[]
  growthEdges: string[]
  relationshipsAndWork: string
  cognitivePattern: {
    dominant: string
    auxiliary: string
    underdeveloped: string
    stressResponse: string
  }
}

type BuildLockedNarrativeInput = {
  personalityProfile: PersonalityProfileSlice
  stillFormingLine: string
  evolutionHistory: ArchetypeEvolutionHistoryEntry[] | undefined
  traits: { strategic: number; tactical: number; visionary: number; builder: number }
  evolutionStatsHint: string
  evolutionNextLabel: string
}

/** Body text behind the full-height fade (excludes the sharp first description paragraph). */
export function buildFounderDnaLockedNarrative(input: BuildLockedNarrativeInput): string {
  const { rest: descRest } = splitFirstParagraph(input.personalityProfile.description)
  const pp = input.personalityProfile
  const parts: string[] = []

  if (descRest.trim()) parts.push(descRest.trim())
  if (input.stillFormingLine.trim()) parts.push(input.stillFormingLine.trim())

  const hist = input.evolutionHistory ?? []
  if (hist.length > 0) {
    const lines = hist.map(
      (e) =>
        `Evolution lineage: ${e.fromPrimary} (${e.periodLabel}) → ${e.toPrimary}`
    )
    parts.push(lines.join('\n'))
  }

  const box = pp.recentExampleBox
  parts.push(
    [
      'From your history',
      box.date,
      `${box.headline}: ${box.example}`,
      box.interpretation,
    ]
      .filter(Boolean)
      .join('\n')
  )

  parts.push(
    [
      'Strategic leaning',
      `${input.traits.strategic}%`,
      'Tactical leaning',
      `${input.traits.tactical}%`,
      'Visionary signal',
      `${input.traits.visionary}%`,
      'Builder signal',
      `${input.traits.builder}%`,
    ].join('\n')
  )

  parts.push(
    ['Path to evolution', input.evolutionNextLabel, input.evolutionStatsHint].filter(Boolean).join('\n')
  )

  if (pp.keyCharacteristics.length) {
    parts.push(['Key characteristics', ...pp.keyCharacteristics.map((c) => `• ${c}`)].join('\n'))
  }
  if (pp.strengths.length) {
    parts.push(['Your strengths', ...pp.strengths.map((c) => `• ${c}`)].join('\n'))
  }
  if (pp.growthEdges.length) {
    parts.push(['Your growth edges', ...pp.growthEdges.map((c) => `• ${c}`)].join('\n'))
  }
  if (pp.relationshipsAndWork.trim()) {
    parts.push(['In relationships and work', pp.relationshipsAndWork].join('\n'))
  }

  parts.push(
    [
      'Your cognitive pattern',
      pp.cognitivePattern.dominant ? `Dominant: ${pp.cognitivePattern.dominant}` : '',
      pp.cognitivePattern.auxiliary ? `Auxiliary: ${pp.cognitivePattern.auxiliary}` : '',
      pp.cognitivePattern.underdeveloped ? `Underdeveloped: ${pp.cognitivePattern.underdeveloped}` : '',
      pp.cognitivePattern.stressResponse ? `Stress response: ${pp.cognitivePattern.stressResponse}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  )

  return parts.filter((p) => p.trim().length > 0).join('\n\n')
}
