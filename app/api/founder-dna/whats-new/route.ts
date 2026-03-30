import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { badgeWhatsNewMeta, FOUNDER_DNA_FEATURE_META } from '@/lib/founder-dna/feature-links'
import type { WhatsNewItem } from '@/lib/types/founder-dna'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('last_viewed_dna_at, unlocked_features')
      .eq('id', userId)
      .maybeSingle()

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 403 })
    }

    const profile = profileRes.data as {
      last_viewed_dna_at?: string | null
      unlocked_features?: unknown
    }

    const lastViewedRaw = profile.last_viewed_dna_at
    // NULL = treat as "caught up" so we do not flood with historical unlocks
    const lastViewedMs = lastViewedRaw ? new Date(lastViewedRaw).getTime() : Date.now()
    const lastViewedIso = new Date(lastViewedMs).toISOString()

    const unlockedFeatures = Array.isArray(profile.unlocked_features)
      ? (profile.unlocked_features as { name?: string }[])
      : []
    const hasEnergyTrends = unlockedFeatures.some((f) => f?.name === 'energy_trends')

    const [newUnlocksRes, lastEveningRes] = await Promise.all([
      db
        .from('user_unlocks')
        .select('unlock_name, unlock_type, unlocked_at')
        .eq('user_id', userId)
        .gt('unlocked_at', lastViewedIso)
        .order('unlocked_at', { ascending: false }),
      hasEnergyTrends
        ? db
            .from('evening_reviews')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
    ])

    const items: WhatsNewItem[] = []
    const seen = new Set<string>()

    const rows = (newUnlocksRes.data ?? []) as {
      unlock_name: string
      unlock_type: string
      unlocked_at: string
    }[]

    for (const row of rows) {
      const createdAt = row.unlocked_at
      if (row.unlock_type === 'feature') {
        // First Glimpse uses the dedicated evening flow (`FirstGlimpseModal`), not this list modal.
        if (row.unlock_name === 'first_glimpse') continue
        const meta = FOUNDER_DNA_FEATURE_META[row.unlock_name]
        if (!meta) continue
        const id = `feature-${row.unlock_name}`
        if (seen.has(id)) continue
        seen.add(id)
        items.push({
          type: 'feature',
          id,
          title: `Unlocked: ${meta.title}`,
          description: meta.description,
          icon: meta.icon,
          link: meta.link,
          createdAt,
        })
      } else if (row.unlock_type === 'badge') {
        const meta = badgeWhatsNewMeta(row.unlock_name)
        const id = `badge-${row.unlock_name}`
        if (seen.has(id)) continue
        seen.add(id)
        items.push({
          type: 'badge',
          id,
          title: `Earned: ${meta.title}`,
          description: meta.description,
          icon: meta.icon,
          link: meta.link,
          createdAt,
        })
      }
    }

    if (hasEnergyTrends && lastEveningRes && 'data' in lastEveningRes && lastEveningRes.data) {
      const le = lastEveningRes.data as { created_at?: string }
      const created = le.created_at ? new Date(le.created_at).getTime() : 0
      if (created > lastViewedMs) {
        const id = 'insight-energy-mood-fresh'
        if (!seen.has(id)) {
          seen.add(id)
          items.push({
            type: 'insight',
            id,
            title: 'Energy & Mood updates',
            description:
              'Mrs. Deer noticed new evening reflections — your Energy & Mood chart may show fresh patterns.',
            icon: '✨',
            link: '/founder-dna/rhythm',
            createdAt: le.created_at ?? new Date().toISOString(),
          })
        }
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      hasNew: items.length > 0,
      items,
    })
  } catch (err) {
    console.error('[founder-dna/whats-new] error', err)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
