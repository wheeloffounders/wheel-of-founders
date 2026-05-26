const BULLET_LINE = /^[\s•\-*–—]+\s*/

function linesFromInsight(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/** Plain text for card titles/highlights — remove markdown tokens. */
export function stripMarkdownDecorators(line: string): string {
  return line
    .replace(BULLET_LINE, '')
    .replace(/^#+\s*/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .trim()
}

function isBulletLine(line: string): boolean {
  return BULLET_LINE.test(line) || line.startsWith('•')
}

/**
 * Parse a saved insight into:
 * - `themeTitle`: first short heading/prose line
 * - `highlights`: first 2–3 scannable lines (bullets if present, otherwise prose)
 * - `bodyLog`: remaining lines excluding the title + highlight lines (prevents “repeat” on expand)
 */
export function parseInsightForChapter({
  insightText,
  fallbackThemeTitle,
  highlightCount = 3,
  themeMaxLen = 120,
}: {
  insightText: string | null
  fallbackThemeTitle: string
  highlightCount?: number
  themeMaxLen?: number
}): { themeTitle: string; highlights: string[]; bodyLog: string } {
  if (!insightText?.trim()) {
    return { themeTitle: fallbackThemeTitle, highlights: [], bodyLog: '' }
  }

  const lines = linesFromInsight(insightText)
  const bulletLines = lines.filter((l) => isBulletLine(l))
  const proseLines = lines.filter((l) => !isBulletLine(l))

  const rawThemeLine =
    proseLines[0]?.length && proseLines[0].length < themeMaxLen ? proseLines[0] : null
  const themeTitle = rawThemeLine ? stripMarkdownDecorators(rawThemeLine) : fallbackThemeTitle

  const usedLineIndices = new Set<number>()

  // Mark theme line index (needed to remove it from bodyLog)
  if (rawThemeLine) {
    const themeIdx = lines.indexOf(rawThemeLine)
    if (themeIdx >= 0) usedLineIndices.add(themeIdx)
  }

  // Decide highlight candidates (bullets preferred if present)
  const highlightSourceLines = bulletLines.length > 0 ? bulletLines : proseLines.slice(rawThemeLine ? 1 : 0)
  const highlights = highlightSourceLines
    .map((l) => stripMarkdownDecorators(l))
    .filter(Boolean)
    .slice(0, highlightCount)

  // Mark actual used indices by scanning `lines` in order.
  // This ensures bodyLog excludes exactly the lines that fed the highlights.
  let marked = 0
  for (let i = 0; i < lines.length && marked < highlightCount; i++) {
    if (usedLineIndices.has(i)) continue

    const candidate = lines[i]!
    const shouldUseBullet = bulletLines.length > 0
    const isCandidateBullet = isBulletLine(candidate)
    if (shouldUseBullet && !isCandidateBullet) continue
    if (!shouldUseBullet && isCandidateBullet) continue

    usedLineIndices.add(i)
    marked++
  }

  const bodyLog = lines.filter((_, i) => !usedLineIndices.has(i)).join('\n').trim()

  return { themeTitle, highlights, bodyLog }
}

