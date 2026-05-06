'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SmartAuthLink } from '@/components/SmartAuthLink'

export function SiteHeader() {
  const pathname = usePathname()
  const isBlog = pathname?.startsWith('/blog')

  return (
    <header className="sticky top-0 left-0 right-0 z-40 border-b border-white/15 bg-[#152b50] text-white shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-[44px] items-center px-3 text-lg font-semibold text-white transition duration-150 hover:text-[#ef725c] active:scale-95 active:bg-white/10"
          aria-label="Go to Homepage"
        >
          Wheel of Founders
        </Link>

        <div className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            href="/blog"
            className={`flex min-h-[44px] items-center rounded px-3 transition ${
              isBlog ? 'text-[#ef725c]' : 'text-white/90 hover:text-[#ef725c]'
            }`}
          >
            Founder&apos;s Journal
          </Link>
          <SmartAuthLink
            className="flex min-h-[44px] items-center rounded px-3 text-white/90 transition hover:text-[#ef725c]"
            loggedOutLabel="Log in"
            loggedInLabel="Dashboard"
            loggedOutHref="/auth/login"
            loggedInHref="/dashboard"
          />
        </div>
      </div>
    </header>
  )
}
