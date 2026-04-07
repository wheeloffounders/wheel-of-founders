'use client'

import Link from 'next/link'

/**
 * Search User: same admin gate as parent {@link app/admin/layout.tsx}.
 */
export default function ListBackendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#ef725c]"
        >
          ← Admin Dashboard
        </Link>
      </div>
      {children}
    </div>
  )
}
