'use client'

import Link from 'next/link'
import { Sun, Moon, AlertTriangle, BarChart3, Calendar, History, BarChart2 } from 'lucide-react'

const links = [
  { href: '/morning', icon: Sun, label: 'Morning', color: 'text-yellow-500', dataTour: 'tour-morning' },
  { href: '/evening', icon: Moon, label: 'Evening', color: 'text-indigo-500', dataTour: 'tour-evening' },
  { href: '/emergency', icon: AlertTriangle, label: 'Emergency', color: 'text-red-500', dataTour: 'emergency' },
  { href: '/weekly', icon: BarChart3, label: 'Weekly', color: 'text-green-500', dataTour: 'weekly' },
  { href: '/monthly-insight', icon: Calendar, label: 'Monthly', color: 'text-purple-500', dataTour: 'monthly' },
  { href: '/quarterly', icon: BarChart2, label: 'Quarterly', color: 'text-amber-500', dataTour: 'quarterly' },
  { href: '/history', icon: History, label: 'History', color: 'text-blue-500', dataTour: 'tour-history' },
]

export function QuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {links.map((link, index) => (
        <Link
          key={index}
          href={link.href}
          data-tour={link.dataTour}
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
