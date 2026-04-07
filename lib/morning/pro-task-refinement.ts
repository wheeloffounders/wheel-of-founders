/** Encode How + Only-I-can in `morning_tasks.action_plan_note` for Pro canvas (Free view still readable). */

export function formatProTaskRefinement(how: string, onlyICanDo: string): string {
  const h = how.trim()
  const o = onlyICanDo.trim()
  const parts: string[] = []
  if (h) parts.push(`How: ${h}`)
  if (o) parts.push(`Only I can: ${o}`)
  return parts.join('\n\n')
}

export function parseProTaskRefinement(note: string | undefined | null): { how: string; onlyICanDo: string } {
  const n = (note ?? '').trim()
  if (!n) return { how: '', onlyICanDo: '' }
  const m = n.match(/\bOnly I can:\s*([\s\S]*)$/i)
  if (!m) {
    if (/^how:\s*/i.test(n)) return { how: n.replace(/^how:\s*/i, '').trim(), onlyICanDo: '' }
    return { how: n, onlyICanDo: '' }
  }
  const onlyICanDo = m[1].trim()
  const head = n.slice(0, m.index ?? 0).replace(/^how:\s*/i, '').trim()
  return { how: head, onlyICanDo }
}
