/**
 * Returns current AI insight usage for the authenticated user.
 * Used by settings/billing UI to show rate limit status.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const db = getServerSupabase()
    const userId = session.user.id

    const { data: profileRaw } = await db
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .maybeSingle()

    const profile = profileRaw as { tier?: string } | null
    const tier = profile?.tier ?? 'free'
    const isPro = tier === 'pro' || tier === 'beta'

    const now = new Date()
    const dayStart = startOfDay(now).toISOString()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const monthStart = startOfMonth(now).toISOString()
    const quarterStart = startOfQuarter(now).toISOString()

    const dailyTypes = ['morning', 'post_morning', 'post_evening', 'emergency'] as const
    const dailyLimit = isPro ? 5 : 2
    const periodLimit = isPro ? 3 : 1

    const dailyCounts: Record<string, number> = {}
    for (const t of dailyTypes) {
      const { count } = await db
        .from('personal_prompts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('prompt_type', t)
        .gte('generated_at', dayStart)
      dailyCounts[t] = count ?? 0
    }

    const usedEmergency = dailyCounts.emergency ?? 0

    const weeklyCount =
      (
        await db
          .from('personal_prompts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('prompt_type', 'weekly')
          .gte('generated_at', weekStart)
      ).count ?? 0

    const monthlyCount =
      (
        await db
          .from('personal_prompts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('prompt_type', 'monthly')
          .gte('generated_at', monthStart)
      ).count ?? 0

    const quarterlyCount =
      (
        await db
          .from('personal_prompts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('prompt_type', 'quarterly')
          .gte('generated_at', quarterStart)
      ).count ?? 0

    return NextResponse.json({
      tier,
      daily: {
        morning: dailyCounts.morning ?? 0,
        post_morning: dailyCounts.post_morning ?? 0,
        post_evening: dailyCounts.post_evening ?? 0,
        limit: dailyLimit,
        emergencyUsed: usedEmergency,
        emergencyLimit: 5,
      },
      weekly: { used: weeklyCount, limit: periodLimit },
      monthly: { used: monthlyCount, limit: periodLimit },
      quarterly: { used: quarterlyCount, limit: periodLimit },
    })
  } catch (error) {
    console.error('[insight-usage] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
