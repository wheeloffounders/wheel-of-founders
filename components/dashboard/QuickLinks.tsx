'use client'

import Link from 'next/link'
import { Sun, Moon, AlertTriangle, BarChart3, Calendar, History } from 'lucide-react'

const links = [
  { href: '/morning', icon: Sun, label: 'Morning', color: 'text-yellow-500' },
  { href: '/evening', icon: Moon, label: 'Evening', color: 'text-indigo-500' },
  { href: '/emergency', icon: AlertTriangle, label: 'Emergency', color: 'text-red-500' },
  { href: '/weekly', icon: BarChart3, label: 'Weekly', color: 'text-green-500' },
  { href: '/monthly-insight', icon: Calendar, label: 'Monthly', color: 'text-purple-500' },
  { href: '/history', icon: History, label: 'History', color: 'text-blue-500' },
]

export function QuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {links.map((link, index) => (
        <Link
          key={index}
          href={link.href}
          className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ef725c] dark:hover:border-[#ef725c] transition-colors group"
        >
          <link.icon className={`w-5 h-5 ${link.color} mb-1`} />
          <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-[#ef725c]">
            {link.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
