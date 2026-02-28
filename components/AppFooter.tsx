'use client'

import { usePathname } from 'next/navigation'

export function AppFooter() {
  const pathname = usePathname()
  if (pathname === '/' || pathname === '/countdown') return null
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 mt-8 py-4 text-center text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
      <p>
        Install Wheel of Founders as an app on desktop or phone – look for{' '}
        <span className="font-medium">Install app</span> in your browser menu. No app store
        needed.
      </p>
    </footer>
  )
}
