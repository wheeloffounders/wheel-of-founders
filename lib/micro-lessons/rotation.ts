type SituationRotation = {
  last?: number
  remaining?: number[]
}

type StruggleRotation = {
  last?: string
  remaining?: string[]
}

export type MicroLessonRotationMemory = {
  situations?: Record<string, SituationRotation>
  struggles?: StruggleRotation
}

export function parseRotationMemory(raw?: string | null): MicroLessonRotationMemory {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as MicroLessonRotationMemory
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

export function stringifyRotationMemory(memory: MicroLessonRotationMemory): string {
  return JSON.stringify(memory)
}

function pickIndex<T>(arr: T[]): number {
  return Math.floor(Math.random() * arr.length)
}

export function chooseVariantIndex(
  memory: MicroLessonRotationMemory,
  situation: string,
  totalVariants: number
): { index: number; nextMemory: MicroLessonRotationMemory } {
  if (totalVariants <= 1) {
    return { index: 0, nextMemory: memory }
  }

  const situations = { ...(memory.situations ?? {}) }
  const current = situations[situation] ?? {}
  const last = typeof current.last === 'number' ? current.last : undefined
  const validIndexes = Array.from({ length: totalVariants }, (_, i) => i)
  let remaining = (current.remaining ?? []).filter((i) => i >= 0 && i < totalVariants)

  if (remaining.length === 0) {
    remaining = validIndexes.filter((i) => i !== last)
    if (remaining.length === 0) remaining = validIndexes
  }

  const chosen = remaining[pickIndex(remaining)]
  situations[situation] = {
    last: chosen,
    remaining: remaining.filter((i) => i !== chosen),
  }

  return {
    index: chosen,
    nextMemory: { ...memory, situations },
  }
}

export function chooseStruggleKey(
  memory: MicroLessonRotationMemory,
  struggleKeys: string[]
): { key: string | null; nextMemory: MicroLessonRotationMemory } {
  if (struggleKeys.length === 0) return { key: null, nextMemory: memory }
  if (struggleKeys.length === 1) return { key: struggleKeys[0], nextMemory: memory }

  const current = memory.struggles ?? {}
  const last = current.last
  let remaining = (current.remaining ?? []).filter((k) => struggleKeys.includes(k))

  if (remaining.length === 0) {
    remaining = struggleKeys.filter((k) => k !== last)
    if (remaining.length === 0) remaining = [...struggleKeys]
  }

  const chosen = remaining[pickIndex(remaining)]
  return {
    key: chosen,
    nextMemory: {
      ...memory,
      struggles: {
        last: chosen,
        remaining: remaining.filter((k) => k !== chosen),
      },
    },
  }
}

