/** Split multi-paragraph copy for freemium “first paragraph sharp” hooks. */
export function splitFirstParagraph(body: string): { lead: string; rest: string } {
  const raw = body.trim()
  if (!raw) return { lead: '', rest: '' }

  const blocks = raw.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length <= 1) {
    const sentenceEnd = raw.search(/[.!?](?:\s|$)/)
    if (sentenceEnd > 0 && sentenceEnd < raw.length - 1) {
      const cut = sentenceEnd + 1
      return { lead: raw.slice(0, cut).trim(), rest: raw.slice(cut).trim() }
    }
    return { lead: raw, rest: '' }
  }

  return {
    lead: blocks[0] ?? '',
    rest: blocks.slice(1).join('\n\n'),
  }
}
