import Link from 'next/link'
import { getServerSupabase } from '@/lib/server-supabase'
import { BarChart3, FlaskConical, LayoutDashboard } from 'lucide-react'
import { format } from 'date-fns'

export default async function AdminDashboardPage() {
  const db = getServerSupabase()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ count: totalUsers }, { data: todayStats }] = await Promise.all([
    db.from('user_profiles').select('*', { count: 'exact', head: true }),
    db.from('daily_stats').select('active_users, new_users').eq('date', today).maybeSingle(),
  ])

  const activeToday = (todayStats as { active_users?: number } | null)?.active_users ?? null
  const newToday = (todayStats as { new_users?: number } | null)?.new_users ?? null

  const links = [
    { href: '/admin/cross-user-analytics', label: 'Cross-User Analytics', icon: BarChart3 },
    { href: '/admin/experiments', label: 'Experiments', icon: FlaskConical },
    { href: '/admin/analytics', label: 'Analytics Overview', icon: LayoutDashboard },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-[#152b50] text-white px-6 py-8 shadow-lg">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-300 text-sm mt-1">Overview and links to admin tools</p>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-[#152b50]">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total users</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers ?? '—'}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-[#ef725c]">
              <div className="text-sm text-gray-600 dark:text-gray-400">Active today</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeToday ?? '—'}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-[#10b981]">
              <div className="text-sm text-gray-600 dark:text-gray-400">New today</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{newToday ?? '—'}</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin tools</h2>
          <ul className="space-y-2">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 p-4 rounded-lg bg-white dark:bg-gray-800 shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
                >
                  <Icon className="w-5 h-5 text-[#ef725c]" />
                  <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
