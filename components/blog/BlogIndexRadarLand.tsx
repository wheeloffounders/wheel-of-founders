'use client'

import { useEffect } from 'react'
import { trackRadarPageView } from '@/lib/radar'

export function BlogIndexRadarLand() {
  useEffect(() => {
    trackRadarPageView({ pagePath: '/blog', source: 'blog', postSlug: 'index' })
  }, [])
  return null
}
