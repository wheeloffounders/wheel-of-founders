'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Calendar, TrendingUp, MapPin, Sparkles, ExternalLink } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { useNewInsights } from '@/lib/hooks/useNewInsights'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { JourneyDNA } from '@/components/dashboard/JourneyDNA'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function emergencyIdFromDataSource(dataSource: string[] | null | undefined): string | null {
  if (!Array.isArray(dataSource)) return null
  for (const s of dataSource) {
    if (typeof s === 'string' && UUID_RE.test(s)) return s
  }
  return null
}

const insightLinks = [
  { name: 'Weekly Insight', href: '/weekly', icon: BarChart2, type: 'weekly' as const },
  { name: 'Monthly Insight', href: '/monthly-insight', icon: Calendar, type: 'monthly' as const },
  { name: 'Quarterly Trajectory', href: '/quarterly', icon: TrendingUp, type: 'quarterly' as const },
  { name: 'Daily History', href: '/history', icon: MapPin, type: null },
]

export default function InsightsPage() {
  const router = useRouter()
  const { newInsights } = useNewInsights()
  const [fireLessons, setFireLessons] = useState<
    Array<{ id: string; insight_text: string; date: string; emergencyId: string | null; fireDate: string | null }>
  >([])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login?returnTo=/insights')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const session = await getUserSession()
      if (!session?.user?.id) return
      const { data } = await supabase
        .from('user_insights')
        .select('id, insight_text, date, data_source')
        .eq('user_id', session.user.id)
        .eq('insight_type', 'suggestion')
        .order('created_at', { ascending: false })
        .limit(12)
      if (cancelled || !data) return
      const fromFires = (data as Array<{ id: string; insight_text: string; date: string; data_source?: string[] | null }>).filter(
        (row) => Array.isArray(row.data_source) && row.data_source.some((s) => String(s).includes('emergenc'))
      )
      const emergencyIds = fromFires.map((r) => emergencyIdFromDataSource(r.data_source)).filter((x): x is string => Boolean(x))
      let fireDateByEmergency = new Map<string, string>()
      if (emergencyIds.length > 0) {
        const { data: emRows } = await supabase
          .from('emergencies')
          .select('id, fire_date')
          .eq('user_id', session.user.id)
          .in('id', emergencyIds)
        for (const row of emRows ?? []) {
          const er = row as { id: string; fire_date: string }
          if (er?.id && er?.fire_date) fireDateByEmergency.set(er.id, er.fire_date)
        }
      }
      setFireLessons(
        fromFires.map((r) => {
          const eid = emergencyIdFromDataSource(r.data_source)
          return {
            id: r.id,
            insight_text: r.insight_text,
            date: r.date,
            emergencyId: eid,
            fireDate: eid ? fireDateByEmergency.get(eid) ?? null : null,
          }
        })
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Insights</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Your weekly, monthly, and quarterly reflections from Mrs. Deer.
      </p>

      <JourneyDNA />

      {fireLessons.length > 0 ? (
        <div className="mb-8 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            Lessons from fires
          </h2>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
            Your own words from the fire, with a light strategic nudge — not generic advice.
          </p>
          <ul className="mt-3 space-y-3">
            {fireLessons.map((row) => {
              const emergencyHref =
                row.emergencyId && row.fireDate
                  ? `/emergency?date=${encodeURIComponent(row.fireDate)}&emergencyId=${encodeURIComponent(row.emergencyId)}#emergency-fire-${row.emergencyId}`
                  : row.emergencyId
                    ? `/emergency?emergencyId=${encodeURIComponent(row.emergencyId)}#emergency-fire-${row.emergencyId}`
                    : null
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-gray-200/90 bg-white/90 px-3 py-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-100"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="neutral"
                      className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200"
                    >
                      Founder wisdom
                    </Badge>
                    {emergencyHref ? (
                      <Link
                        href={emergencyHref}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800/90 underline-offset-2 hover:underline dark:text-emerald-300/90"
                      >
                        Open originating fire
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                  <p className="leading-relaxed">{row.insight_text}</p>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

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
