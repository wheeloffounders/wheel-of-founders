'use client'

import { useEffect } from 'react'
import { trackRadarPageView } from '@/lib/radar'

type Props = {
  slug: string
  /** From MDX when post embeds InteractiveTemplate / DecisionParserWidget */
  widgetFunnelId?: string | null
}

/** Fires once per browser session when a blog post is opened (read-only visits included). */
export function BlogPostRadarLand({ slug, widgetFunnelId }: Props) {
  useEffect(() => {
    trackRadarPageView({
      pagePath: `/blog/${slug}`,
      source: 'blog',
      widgetFunnelId: widgetFunnelId ?? null,
    })
  }, [slug, widgetFunnelId])

  return null
}
