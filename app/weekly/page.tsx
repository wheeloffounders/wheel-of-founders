'use client'

import { useState, useEffect, useRef } from 'react'
import { format, subDays } from 'date-fns'
import {
  Calendar,
  Target,
  Flame,
  Heart,
  Zap,
  Copy,
  Check,
  TrendingUp,
  Award,
  Lightbulb,
  Shield,
} from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useRouter } from 'next/navigation' // Add useRouter
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth' // Add getUserSession
import { ACTION_PLAN_OPTIONS_2, ActionPlanOption2 } from '@/app/morning/page' // Import new action plan options
import { calculateStreak } from '@/lib/streak'
import { trackEvent } from '@/lib/analytics'

interface WeekStats {
  tasksTotal: number
  needleMovers: number
  firesTotal: number
  firesResolved: number
  avgMood: number | null
  avgEnergy: number | null
  actionMix: Record<ActionPlanOption2, number> // Use ActionPlanOption2 here
  decisions: number
  wins: string[]
  lessons: string[]
  dateRange: { start: string; end: string }
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Tough',
  2: 'Meh',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

export default function WeeklyPage() {
  const router = useRouter() // Initialize useRouter

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
    }
    checkAuth()
  }, [router]) // Add router to dependency array

  const [stats, setStats] = useState<WeekStats>({
    tasksTotal: 0,
    needleMovers: 0,
    firesTotal: 0,
    firesResolved: 0,
    avgMood: null,
    avgEnergy: null,
    actionMix: {}, // Initialize actionMix as an empty object
    decisions: 0,
    wins: [],
    lessons: [],
    dateRange: { start: '', end: '' },
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchWeekData = async () => {
      setLoading(true) // Ensure loading state is set
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const endDate = new Date()
      const startDate = subDays(endDate, 6)
      const startStr = format(startDate, 'yyyy-MM-dd')
      const endStr = format(endDate, 'yyyy-MM-dd')

      const [tasksRes, emergenciesRes, reviewsRes, decisionsRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('needle_mover, action_plan') // Use action_plan
          .gte('plan_date', startStr)
          .lte('plan_date', endStr)
          .eq('user_id', session.user.id), // Filter by user_id
        supabase
          .from('emergencies')
          .select('resolved')
          .gte('fire_date', startStr)
          .lte('fire_date', endStr)
          .eq('user_id', session.user.id), // Filter by user_id
        supabase
          .from('evening_reviews')
          .select('mood, energy, wins, lessons')
          .gte('review_date', startStr)
          .lte('review_date', endStr)
          .eq('user_id', session.user.id), // Filter by user_id
        supabase
          .from('morning_decisions')
          .select('id')
          .gte('plan_date', startStr)
          .lte('plan_date', endStr)
          .eq('user_id', session.user.id), // Filter by user_id
      ])

      const tasks = tasksRes.data ?? []
      const emergencies = emergenciesRes.data ?? []
      const reviews = reviewsRes.data ?? []
      const decisions = decisionsRes.data ?? []

      const needleMovers = tasks.filter((t) => t.needle_mover).length
      const firesResolved = emergencies.filter((e) => e.resolved).length
      const moods = reviews
        .map((r) => r.mood)
        .filter((m): m is number => m != null)
      const energies = reviews
        .map((r) => r.energy)
        .filter((e): e is number => e != null)
      
      // Use actionMix for consistency with dashboard
      const actionMix: Record<string, number> = {};
      tasks.forEach((t) => {
        const p = t.action_plan || 'my_zone'; // Default to my_zone if somehow null
        actionMix[p] = (actionMix[p] || 0) + 1;
      });

      // Parse wins and lessons: handle both JSON arrays (new format) and strings (old format)
      const wins: string[] = []
      const lessons: string[] = []
      
      reviews.forEach((r) => {
        // Parse wins
        if (r.wins) {
          if (typeof r.wins === 'string') {
            try {
              const parsed = JSON.parse(r.wins)
              if (Array.isArray(parsed)) {
                wins.push(...parsed.filter((w: string) => w?.trim()))
              } else if (parsed.trim()) {
                // Old format: single string
                wins.push(parsed)
              }
            } catch {
              // Not JSON, treat as old format string
              if (r.wins.trim()) {
                wins.push(r.wins)
              }
            }
          }
        }
        
        // Parse lessons
        if (r.lessons) {
          if (typeof r.lessons === 'string') {
            try {
              const parsed = JSON.parse(r.lessons)
              if (Array.isArray(parsed)) {
                lessons.push(...parsed.filter((l: string) => l?.trim()))
              } else if (parsed.trim()) {
                // Old format: single string
                lessons.push(parsed)
              }
            } catch {
              // Not JSON, treat as old format string
              if (r.lessons.trim()) {
                lessons.push(r.lessons)
              }
            }
          }
        }
      })

      // Fetch streak data
      const streakData = await calculateStreak(session.user.id)
      setCurrentStreak(streakData.currentStreak)
      setLongestStreak(streakData.longestStreak)

      setStats({
        tasksTotal: tasks.length,
        needleMovers,
        firesTotal: emergencies.length,
        firesResolved,
        avgMood:
          moods.length > 0
            ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10
            : null,
        avgEnergy:
          energies.length > 0
            ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10
            : null,
        actionMix: actionMix, // Corrected to use actionMix
        decisions: decisions.length,
        wins,
        lessons,
        dateRange: { start: startStr, end: endStr },
      })
      setLoading(false)
      trackEvent('weekly_page_view', { date_range: `${startStr} to ${endStr}` })
    }

    fetchWeekData()
  }, [])

  const handleCopySummary = async () => {
    if (!stats) return
    const text = [
      `📊 Wheel of Founders — Weekly Summary`,
      `${format(new Date(stats.dateRange.start), 'MMM d')} – ${format(new Date(stats.dateRange.end), 'MMM d, yyyy')}`,
      ``,
      `✅ Tasks: ${stats.tasksTotal} | Needle Movers: ${stats.needleMovers}`,
      `🔥 Fires: ${stats.firesTotal} (${stats.firesResolved} resolved)`,
      stats.avgMood != null ? `😊 Avg Mood: ${MOOD_LABELS[Math.round(stats.avgMood)] || stats.avgMood}/5` : '',
      stats.avgEnergy != null ? `⚡ Avg Energy: ${stats.avgEnergy}/5` : '',
      stats.decisions > 0 ? `🎯 Decisions: ${stats.decisions}` : '',
      stats.wins.length > 0 ? `\nWins:\n${stats.wins.map((w) => `• ${w}`).join('\n')}` : '',
      stats.lessons.length > 0 ? `\nLessons:\n${stats.lessons.map((l) => `• ${l}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback ignored
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading weekly insights...</p>
      </div>
    )
  }

  const needlePct =
    stats.tasksTotal > 0
      ? Math.round((stats.needleMovers / stats.tasksTotal) * 100)
      : 0
  const firesResolvedPct =
    stats.firesTotal > 0
      ? Math.round((stats.firesResolved / stats.firesTotal) * 100)
      : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#152b50] mb-1 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#ef725c]" />
            Weekly Insights
          </h1>
          <p className="text-gray-600">
            {format(new Date(stats.dateRange.start), 'MMM d')} –{' '}
            {format(new Date(stats.dateRange.end), 'MMM d, yyyy')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopySummary}
          className="flex items-center gap-2 px-4 py-2 bg-[#152b50] text-white rounded-lg font-medium hover:bg-[#1a3565] transition shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Summary
            </>
          )}
        </button>
      </div>

      {/* Infographic Card */}
      <div
        ref={shareRef}
        className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#152b50]"
      >
        {/* Banner */}
        <div className="bg-[#152b50] text-white px-6 py-4">
          <h2 className="text-xl font-bold text-[#ef725c]">Wheel of Founders</h2>
          <p className="text-white/80 text-sm">
            Weekly Summary •{' '}
            {format(new Date(stats.dateRange.start), 'MMM d')} –{' '}
            {format(new Date(stats.dateRange.end), 'MMM d')}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBlock
              icon={<Target className="w-6 h-6 text-green-500" />}
              label="Needle Movers"
              value={`${stats.needleMovers}/${stats.tasksTotal}`}
              sub={stats.tasksTotal > 0 ? `${needlePct}%` : undefined}
            />
            <StatBlock
              icon={<Shield className="w-6 h-6 text-blue-500" />}
              label="Founder Actions"
              value={stats.tasksTotal > 0 ? 'Tracked' : '—'}
              sub={
                Object.keys(stats.actionMix).length > 0
                  ? Object.entries(stats.actionMix)
                      .map(([k, v]) => `${ACTION_PLAN_OPTIONS_2.find(opt => opt.value === k)?.label || k}: ${v}`)
                      .join(' | ') || undefined
                  : undefined
              }
            />
            <StatBlock
              icon={<Flame className="w-6 h-6 text-orange-500" />}
              label="Fires Fought"
              value={stats.firesTotal.toString()}
              sub={
                stats.firesTotal > 0
                  ? `${stats.firesResolved} resolved (${firesResolvedPct}%)`
                  : undefined
              }
            />
            <StatBlock
              icon={<TrendingUp className="w-6 h-6 text-purple-500" />}
              label="Decisions"
              value={stats.decisions.toString()}
            />
          </div>

          {/* Streak Stats */}
          {(currentStreak > 0 || longestStreak > 0) && (
            <div className="bg-gradient-to-r from-[#ef725c]/10 to-[#152b50]/10 rounded-lg p-4 border border-[#ef725c]/20">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-[#ef725c]" />
                <h3 className="text-sm font-semibold text-gray-700">Streak Stats</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                {currentStreak > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">Current:</span>
                    <span className="text-lg font-bold text-[#ef725c]">{currentStreak} days</span>
                  </div>
                )}
                {longestStreak > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">Best:</span>
                    <span className="text-lg font-bold text-[#152b50]">{longestStreak} days</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mood & Energy */}
          {(stats.avgMood != null || stats.avgEnergy != null) && (
            <div className="flex flex-wrap gap-4">
              {stats.avgMood != null && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg relative">
                  <span className="absolute -top-1 -right-1">
                    <InfoTooltip text="Average of your daily mood ratings (1–5) from Evening Reviews this week." />
                  </span>
                  <Heart className="w-5 h-5 text-[#ef725c]" />
                  <span className="text-gray-700">
                    Avg Mood:{' '}
                    <strong className="text-[#152b50]">
                      {MOOD_LABELS[Math.round(stats.avgMood)]} ({stats.avgMood}/5)
                    </strong>
                  </span>
                </div>
              )}
              {stats.avgEnergy != null && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg relative">
                  <span className="absolute -top-1 -right-1">
                    <InfoTooltip text="Average of your daily energy levels (1–5) from Evening Reviews this week." />
                  </span>
                  <Zap className="w-5 h-5 text-[#152b50]" />
                  <span className="text-gray-700">
                    Avg Energy:{' '}
                    <strong className="text-[#152b50]">{stats.avgEnergy}/5</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Founder Action Mix */}
          {Object.keys(stats.actionMix).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Founder Action Mix
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.actionMix)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count]) => (
                    <span
                      key={key}
                      className="px-3 py-1 bg-[#152b50]/10 text-[#152b50] rounded-full text-sm font-medium"
                    >
                      {ACTION_PLAN_OPTIONS_2.find(opt => opt.value === key)?.emoji} {ACTION_PLAN_OPTIONS_2.find(opt => opt.value === key)?.label}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Wins */}
          {stats.wins.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#ef725c]" />
                Wins This Week
              </h3>
              <ul className="space-y-1 text-gray-800">
                {stats.wins.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#ef725c]">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lessons */}
          {stats.lessons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#152b50]" />
                Lessons for Next Week
              </h3>
              <ul className="space-y-1 text-gray-800">
                {stats.lessons.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#152b50]">•</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center text-sm text-gray-500">
          wheeloffounders.com • Your daily founder coaching companion
        </div>
      </div>

      {stats.tasksTotal === 0 &&
        stats.firesTotal === 0 &&
        stats.wins.length === 0 &&
        stats.lessons.length === 0 &&
        !stats.avgMood &&
        !stats.avgEnergy && (
          <p className="mt-6 text-center text-gray-500">
            No data for this week yet. Start your Morning Plan and Evening Reviews
            to build your insights.
          </p>
        )}
    </div>
  )
}

function StatBlock({
  icon,
  label,
  value,
  sub,
  tooltip,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tooltip?: string
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative">
      {tooltip && (
        <div className="absolute top-3 right-3">
          <InfoTooltip text={tooltip} />
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-[#152b50] mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

