'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { isDevelopment, requireDevOnly } from '@/lib/env'

/**
 * Search User: dev-only admin section.
 * Extends parent admin layout (which checks is_admin).
 * Adds dev-only gate - redirects to /admin if not in development.
 */
export default function ListBackendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    try {
      requireDevOnly()
    } catch {
      // Use window.location to avoid "Router action dispatched before initialization" (Next.js 16)
      if (typeof window !== 'undefined') {
        window.location.href = '/admin?message=search-user-dev-only'
      }
    }
  }, [])

  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Search User is only available in development.
          </p>
          <Link
            href="/admin"
            className="text-[#ef725c] hover:underline font-medium"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#ef725c]"
        >
          ← Admin Dashboard
        </Link>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
          Dev Only
        </span>
      </div>
      {children}
    </div>
  )
}
