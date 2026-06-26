/**
 * Best-effort parse of the primary interactive funnel id from blog MDX source.
 * Keeps server-side blog pages in sync with `<InteractiveTemplate context="…" />`.
 */
export function extractPrimaryWidgetFunnelFromMdx(raw: string): string | null {
  const interactive = raw.match(/<InteractiveTemplate[^>]*\scontext=["']([a-z0-9_]+)["']/i)
  if (interactive?.[1]) return interactive[1].toLowerCase()

  const decision = raw.match(/<DecisionParserWidget[^>]*\scontext=["']([a-z0-9_]+)["']/i)
  if (decision?.[1]) return decision[1].toLowerCase()

  return null
}

/** Stable funnel_id for posts without a widget (FUNNEL_RE-safe). */
export function blogSlugToPostFunnelId(slug: string): string {
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  return `post_${normalized || 'unknown'}`
}
