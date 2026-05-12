/**
 * Mirrors `app/today/page.tsx` → `/morning` query rules (product alias for today's plan).
 * Shared with Edge proxy so `/today` → login `returnTo` matches the server redirect.
 */
export function morningHandoffPathFromTodaySearchParams(sp: URLSearchParams): string {
  const qs = new URLSearchParams()
  const context = sp.get('context')?.trim()
  if (context) qs.set('context', context)
  else if (sp.get('parserPass') === '1') qs.set('context', 'decision')
  const from = sp.get('from')?.trim()
  if (from && from.startsWith('/blog')) qs.set('from', from)
  const funnel = sp.get('funnel')?.trim()
  if (funnel) qs.set('funnel', funnel)
  const q = qs.toString() ? `?${qs.toString()}` : ''
  return `/morning${q}`
}
