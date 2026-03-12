'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, User, BarChart3 } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { founderStruggles } from '@/lib/founder-struggles'

type UserResult = {
  id: string
  email: string | null
  name: string | null
  last_active: string | null
  streak: number | null
  profile: Record<string, unknown> | null
}

type FunnelStep = {
  step_name: string
  step_number: number
  users: number
  completion_rate: number
  step_conversion: number | null
}

function matchesQuery(q: string, u: UserResult): boolean {
  const lower = q.toLowerCase()
  if (u.email?.toLowerCase().includes(lower)) return true
  if (u.name?.toLowerCase().includes(lower)) return true
  if (u.id.toLowerCase().includes(lower)) return true
  return false
}

function formatStruggles(profile: Record<string, unknown> | null): string {
  if (!profile) return '—'
  const struggles = profile.struggles as string[] | null | undefined
  const strugglesOther = profile.struggles_other as string | null | undefined
  const ids = Array.isArray(struggles) ? struggles : []
  const labels = ids.map((id) => founderStruggles.find((s) => s.id === id)?.label ?? id)
  const parts: string[] = []
  if (labels.length > 0) parts.push(labels.join(', '))
  if (strugglesOther?.trim()) parts.push(`"${strugglesOther.trim()}"`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export default function SearchUserPage() {
  const [query, setQuery] = useState('')
  const [allUsers, setAllUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(true)
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([])
  const [funnelLoading, setFunnelLoading] = useState(true)

  const users = useMemo(() => {
    const q = query.trim()
    if (!q || q.length < 2) return allUsers
    return allUsers.filter((u) => matchesQuery(q, u))
  }, [allUsers, query])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/list/users', { credentials: 'include' })
        if (res.ok) {
          const { users: u } = await res.json()
          setAllUsers(u ?? [])
        } else {
          setAllUsers([])
        }
      } catch {
        setAllUsers([])
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    const fetchFunnel = async () => {
      const session = await getUserSession()
      if (!session?.user?.is_admin) return
      try {
        const res = await fetch('/api/admin/funnels?funnel=daily_flow&days=30', { credentials: 'include' })
        if (res.ok) {
          const { steps } = await res.json()
          setFunnelSteps(steps ?? [])
        }
      } catch {
        // Ignore
      } finally {
        setFunnelLoading(false)
      }
    }
    fetchFunnel()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Search User</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Search by email, name, or user ID — or scroll to browse all users (dev only)</p>
        </section>

        {/* Search bar */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, name, or user ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500"
            />
          </div>
        </section>

        {/* Funnel Stats */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-[#ef725c]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Funnel Stats (daily_flow, 30 days)
          </h2>
          {funnelLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : funnelSteps.length === 0 ? (
            <p className="text-sm text-gray-500">No funnel data</p>
          ) : (
            <div className="space-y-2">
              {funnelSteps.map((step) => (
                <div key={step.step_number} className="flex items-center gap-4 text-sm">
                  <span className="w-8 text-gray-500">{step.step_number}.</span>
                  <span className="flex-1 text-gray-900 dark:text-white">{step.step_name}</span>
                  <span className="font-medium">{step.users} users</span>
                  <span className="text-gray-500">{step.completion_rate}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Users list - all users underneath, filter by search */}
        <section>
          {loading ? (
            <p className="text-sm text-gray-500">Loading users...</p>
          ) : users.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300">Email</th>
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300">What brings you here</th>
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300">Last Active</th>
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300">Streak</th>
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{u.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={formatStruggles(u.profile)}>{formatStruggles(u.profile)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.last_active ?? '—'}</td>
                      <td className="px-4 py-3">{u.streak ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/list/users/${u.id}`}
                          className="inline-flex items-center gap-1 text-[#ef725c] hover:underline font-medium"
                        >
                          <User className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No users found</p>
          )}
        </section>
      </div>
    </div>
  )
}
