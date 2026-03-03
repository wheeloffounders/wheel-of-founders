'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Calendar, TrendingUp, MapPin } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { useNewInsights } from '@/lib/hooks/useNewInsights'
import { Badge } from '@/components/ui/badge'

const insightLinks = [
  { name: 'Weekly Insight', href: '/weekly', icon: BarChart2, type: 'weekly' as const },
  { name: 'Monthly Insight', href: '/monthly-insight', icon: Calendar, type: 'monthly' as const },
  { name: 'Quarterly Trajectory', href: '/quarterly', icon: TrendingUp, type: 'quarterly' as const },
  { name: 'Daily History', href: '/history', icon: MapPin, type: null },
]

export default function InsightsPage() {
  const router = useRouter()
  const { newInsights } = useNewInsights()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login?returnTo=/insights')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Insights</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Your weekly, monthly, and quarterly reflections from Mrs. Deer.
      </p>

      <div className="space-y-3">
        {insightLinks.map((link) => {
          const Icon = link.icon
          const isNew = link.type && newInsights[link.type]
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ef725c] dark:hover:border-[#ef725c] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-[#ef725c]" />
                <span className="font-medium text-gray-900 dark:text-white">{link.name}</span>
                {isNew && (
                  <Badge variant="coral">New</Badge>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
