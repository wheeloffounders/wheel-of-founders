/**
 * Normalizes LLM output that should be JSON: strips markdown code fences and
 * isolates the outermost `{...}` or `[...]` so JSON.parse is reliable when the
 * model wraps output in ```json or adds preamble.
 */
export function sanitizeAiJsonText(raw: string): string {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  let s = raw.trim()
  s = s.replace(/```(?:json)?/gi, '')
  s = s.replace(/```/g, '')
  s = s.replace(/^\uFEFF/, '').trim()

  const objStart = s.indexOf('{')
  const arrStart = s.indexOf('[')

  if (objStart === -1 && arrStart === -1) return s

  const objectFirst = objStart !== -1 && (arrStart === -1 || objStart < arrStart)

  if (objectFirst) {
    const end = s.lastIndexOf('}')
    if (end > objStart) return s.slice(objStart, end + 1)
  }

  if (arrStart !== -1) {
    const end = s.lastIndexOf(']')
    if (end > arrStart) return s.slice(arrStart, end + 1)
  }

  if (objStart !== -1) {
    const end = s.lastIndexOf('}')
    if (end > objStart) return s.slice(objStart, end + 1)
  }

  return s
}

/** Narrow strip for callers that only need fence removal (no delimiter slice). */
export function stripAiMarkdownCodeFences(raw: string): string {
  return raw
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()
}

/**
 * If JSON/Markdown leaked into a single card line (e.g. "```json", "[ {"), strip noise for display.
 * Safe for Mrs. Deer's Ideas / tray titles — does not assume valid JSON.
 */
export function sanitizeAiCardLabelText(raw: string): string {
  let s = stripAiMarkdownCodeFences(String(raw ?? '')).trim()
  s = s.replace(/^["']|["']$/g, '')
  for (let i = 0; i < 10; i++) {
    const next = s
      .replace(/^[{[\]",:\s]+/, '')
      .replace(/[{[\]",:\s]+$/, '')
      .trim()
    if (next === s) break
    s = next
  }
  if (s.startsWith('[') && s.includes(']')) {
    try {
      const slice = sanitizeAiJsonText(s)
      const parsed = JSON.parse(slice) as unknown
      if (typeof parsed === 'string' && parsed.trim()) return sanitizeAiCardLabelText(parsed)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0]
        if (typeof first === 'string' && first.trim()) return sanitizeAiCardLabelText(first)
        if (first && typeof first === 'object') {
          const o = first as Record<string, unknown>
          const t = o.task ?? o.title ?? o.text
          if (typeof t === 'string' && t.trim()) return sanitizeAiCardLabelText(t)
        }
      }
    } catch {
      /* keep stripped s */
    }
  }
  return s.trim()
}

/**
 * When every non-empty WHY shares a very long common prefix (typical Mad-Libs pivot + task template),
 * strip that prefix so each line’s task-specific tail is visible. Reduces redundant cognitive load.
 */
export function dedupeRedundantWhyLines(lines: string[]): string[] {
  const trimmed = lines.map((s) => (typeof s === 'string' ? s.trim() : ''))
  const nonEmpty = trimmed.filter((s) => s.length > 0)
  if (nonEmpty.length < 2) return trimmed

  let lcp = nonEmpty[0]
  for (let k = 1; k < nonEmpty.length; k++) {
    const b = nonEmpty[k]
    let j = 0
    const max = Math.min(lcp.length, b.length)
    while (j < max && lcp.charCodeAt(j) === b.charCodeAt(j)) j++
    lcp = lcp.slice(0, j)
    if (!lcp) return trimmed
  }

  const minLen = Math.min(...nonEmpty.map((s) => s.length))
  if (lcp.length < 24 || minLen < 24) return trimmed

  const ratioOk = nonEmpty.every((s) => lcp.length / s.length >= 0.72)
  if (!ratioOk) return trimmed

  return trimmed.map((s) => {
    if (!s || !s.startsWith(lcp)) return s
    const tail = s.slice(lcp.length).trim().replace(/^[\s"'·—\-:,.]+/, '')
    return tail.length >= 6 ? tail : s
  })
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * If the WHY echoes too much of the Daily Pivot, strip that overlap — bridge, not mirror.
 * Removes (1) full pivot when embedded verbatim, (2) any pivot substring ≥50% of pivot length (min 12 chars) found in WHY.
 */
export function stripDailyPivotMirrorFromWhy(why: string, dailyPivot: string): string {
  const original = why.trim()
  const p = dailyPivot.trim()
  if (!original || !p || p.length < 12) return original

  let w = original
  const minSlice = Math.max(12, Math.ceil(p.length * 0.5))

  for (let iter = 0; iter < 6; iter++) {
    let wLower = w.toLowerCase()
    const pLower = p.toLowerCase()

    if (pLower.length >= 12 && wLower.includes(pLower)) {
      w = w.replace(new RegExp(escapeRegExp(p), 'gi'), ' ').replace(/\s+/g, ' ').trim()
      if (w.length < 8) return original
      continue
    }

    let removed = false
    for (let len = p.length; len >= minSlice; len--) {
      for (let i = 0; i + len <= p.length; i++) {
        const slice = p.slice(i, i + len)
        const idx = wLower.indexOf(slice.toLowerCase())
        if (idx !== -1) {
          w = (w.slice(0, idx) + w.slice(idx + slice.length)).replace(/\s+/g, ' ').trim()
          removed = true
          break
        }
      }
      if (removed) break
    }
    if (!removed) break
    if (w.length < 8) return original
  }

  const out = w.replace(/^[\s—\-,.:]+|[\s—\-,.:]+$/g, '').trim()
  return out.length >= 8 ? out : original
}
