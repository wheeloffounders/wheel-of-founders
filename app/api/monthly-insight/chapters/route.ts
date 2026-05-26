import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { format, parseISO } from 'date-fns'
import { isMonthlyInsightFeatureLocked, type UserProfile } from '@/lib/features'
import { parseInsightForChapter } from '@/lib/insights/parse-insight-chapter'

const PROFILE_SELECT =
  'tier, pro_features_enabled, subscription_override, subscription_tier, is_beta_retired, is_beta, trial_starts_at, trial_ends_at, stripe_subscription_status, created_at' as const

function userProfileFromRow(row: Record<string, unknown> | null): UserProfile {
  return {
    tier: row?.tier as string | undefined,
    pro_features_enabled: row?.pro_features_enabled as boolean | undefined,
    subscription_override: (row?.subscription_override as string | null) ?? null,
    subscription_tier: (row?.subscription_tier as string | null) ?? null,
    is_beta_retired: (row?.is_beta_retired as boolean | null) ?? null,
    is_beta: (row?.is_beta as boolean | null) ?? null,
    trial_starts_at: (row?.trial_starts_at as string | null) ?? null,
    trial_ends_at: (row?.trial_ends_at as string | null) ?? null,
    stripe_subscription_status: (row?.stripe_subscription_status as string | null) ?? null,
    created_at: (row?.created_at as string | null) ?? null,
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getServerSupabase()
    const userId = session.user.id

    const [profileRes, promptsRes] = await Promise.all([
      db
        .from('user_profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle(),
      db
        .from('personal_prompts')
        .select('prompt_date, prompt_text')
        .eq('user_id', userId)
        .eq('prompt_type', 'monthly')
        .order('prompt_date', { ascending: false }),
    ])

    const profileUser = userProfileFromRow((profileRes.data as Record<string, unknown> | null) ?? null)
    const aiSynthesisLocked = isMonthlyInsightFeatureLocked('ai_synthesis', profileUser)

    const rows = (promptsRes.data ?? []) as {
      prompt_date?: string
      prompt_text?: string | null
    }[]

    const chapters = rows
      .filter((r) => Boolean(r.prompt_date))
      .filter((r) => Boolean((r.prompt_text ?? '').trim()))
      .map((r) => {
        const monthStart = r.prompt_date!.slice(0, 10)
        const periodKey = monthStart.slice(0, 7) // YYYY-MM
        const periodLabel = format(parseISO(monthStart), 'MMM yyyy')

        const insightText = aiSynthesisLocked ? null : r.prompt_text ?? null
        const parsed = parseInsightForChapter({
          insightText,
          fallbackThemeTitle: periodLabel,
        })

        return {
          periodKey,
          periodLabel,
          themeTitle: parsed.themeTitle,
          highlights: parsed.highlights,
          bodyLog: parsed.bodyLog,
        }
      })

    return NextResponse.json({ chapters })
  } catch (err) {
    console.error('[monthly-insight/chapters] error', err)
    return NextResponse.json({ error: 'Failed to load monthly chapters' }, { status: 500 })
  }
}

