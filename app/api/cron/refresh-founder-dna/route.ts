import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getLocalDayOfWeekSun0, getUserTimezoneFromProfile } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

const RHYTHM_ENDPOINTS: Array<{ path: string; method: 'GET' | 'POST' }> = [
  { path: '/api/founder-dna/your-story', method: 'GET' },
  { path: '/api/founder-dna/celebration-gap', method: 'GET' },
  { path: '/api/founder-dna/unseen-wins/refresh', method: 'POST' },
]

const PATTERNS_ENDPOINTS: Array<{ path: string; method: 'GET' | 'POST' }> = [
  { path: '/api/founder-dna/trends', method: 'GET' },
  { path: '/api/founder-dna/decisions', method: 'GET' },
  { path: '/api/founder-dna/postponements', method: 'GET' },
  { path: '/api/founder-dna/recurring-question', method: 'GET' },
]

type RefreshGroup = 'rhythm' | 'patterns' | null

function resolveRefreshGroup(now: Date, timeZone: string): RefreshGroup {
  const localDow = getLocalDayOfWeekSun0(now, timeZone)
  if (localDow === 2) return 'rhythm'
  if (localDow === 3) return 'patterns'
  return null
}

export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/refresh-founder-dna', request)
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    request.nextUrl.origin

  const db = getServerSupabase()
  const now = new Date()
  const startMs = Date.now()
  const summary = {
    totalUsers: 0,
    skippedNotTuesdayOrWednesday: 0,
    processedUsers: 0,
    usersWithErrors: 0,
    endpointCalls: 0,
    endpointSuccesses: 0,
    endpointSkipsLocked: 0,
    endpointErrors: 0,
  }

  const { data: profiles, error } = await db
    .from('user_profiles')
    .select('id, timezone')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const users = (profiles ?? []) as Array<{ id: string; timezone?: string | null }>
  summary.totalUsers = users.length

  const CONCURRENCY = 20
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const chunk = users.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map(async (user) => {
        const tz = getUserTimezoneFromProfile(user)
        const group = resolveRefreshGroup(now, tz)
        if (!group) {
          summary.skippedNotTuesdayOrWednesday++
          return
        }

        const endpoints = group === 'rhythm' ? RHYTHM_ENDPOINTS : PATTERNS_ENDPOINTS
        let hadError = false
        for (const endpoint of endpoints) {
          summary.endpointCalls++
          try {
            const res = await fetch(`${appUrl}${endpoint.path}`, {
              method: endpoint.method,
              headers: {
                Authorization: `Bearer ${cronSecret}`,
                'x-cron-user-id': user.id,
              },
            })
            if (res.ok) {
              summary.endpointSuccesses++
            } else if (res.status === 403) {
              // Locked or no-content gates are expected for some users.
              summary.endpointSkipsLocked++
            } else {
              hadError = true
              summary.endpointErrors++
            }
          } catch {
            hadError = true
            summary.endpointErrors++
          }
        }
        summary.processedUsers++
        if (hadError) summary.usersWithErrors++
      }),
    )

    for (const result of settled) {
      if (result.status === 'rejected') {
        summary.usersWithErrors++
      }
    }
  }

  return NextResponse.json({
    success: true,
    processingTimeMs: Date.now() - startMs,
    ...summary,
  })
}
