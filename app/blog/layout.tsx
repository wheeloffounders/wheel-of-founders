import type { ReactNode } from 'react'
import Link from 'next/link'

/** Blog sits under the global shell; this adds a light sub-nav for discovery SEO pages. */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 pb-24 sm:px-8">
      <nav
        aria-label="Blog"
        className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-3 text-sm dark:border-zinc-700/80"
      >
        <Link href="/blog" className="font-medium text-[#ef725c] hover:underline">
          Blog
        </Link>
        <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← App home
        </Link>
      </nav>
      {children}
    </div>
  )
}
