'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNewInsights } from '@/lib/hooks/useNewInsights'

export function InsightNotificationBadge() {
  const { totalNew } = useNewInsights()

  if (totalNew === 0) return null

  return (
    <Link href="/insights" className="relative inline-block" aria-label={`${totalNew} new insight${totalNew > 1 ? 's' : ''} available`}>
      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      <span className="absolute -top-1 -right-1 bg-[#ef725c] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
        {totalNew}
      </span>
    </Link>
  )
}
