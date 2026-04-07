/**
 * Split Mrs. Deer post-evening stream: main reflection vs Goodnight sign-off (last block).
 */
export function splitEveningCoachMessage(text: string): { body: string; goodnight: string | null } {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return { body: '', goodnight: null }
  const parts = trimmed.split(/\n\n+/).filter(Boolean)
  if (parts.length < 2) return { body: trimmed, goodnight: null }
  const last = parts[parts.length - 1]!
  if (/good\s*night/i.test(last)) {
    return { body: parts.slice(0, -1).join('\n\n'), goodnight: last }
  }
  return { body: trimmed, goodnight: null }
}

/**
 * When hot fires remain, bold markdown sentences in the goodnight block that anchor tomorrow debt.
 */
export function emphasizeTomorrowDebtInGoodnight(markdown: string, hotUnresolvedCount: number): string {
  if (hotUnresolvedCount <= 0 || !markdown.trim()) return markdown
  return markdown
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => {
      const s = chunk.trim()
      if (!s) return ''
      if (s.includes('**')) return chunk
      if (/\b(hot|unresolved|fire|fires|tomorrow debt|debt)\b/i.test(s)) {
        return `**${s}**`
      }
      return chunk
    })
    .join(' ')
}
