import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/SiteHeader'

/** Blog sits under the global shell; this adds a light sub-nav for discovery SEO pages. */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="px-6 pb-24 pt-8 sm:px-8 sm:pt-10">{children}</div>
    </>
  )
}
