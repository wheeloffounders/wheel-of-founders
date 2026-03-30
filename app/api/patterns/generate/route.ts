import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { generateUnseenWinsPatternForUser } from '@/lib/patterns/generate-unseen-wins-pattern'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST: Returns AI pattern only (cron or session). Does not write DB.
 * Rhythm page uses POST /api/founder-dna/unseen-wins/refresh to generate + persist.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

    let userId: string | null = null
    if (isCron) {
      const body = await request.json().catch(() => ({}))
      userId = (body as { userId?: string }).userId ?? null
      if (!userId) {
        return NextResponse.json({ error: 'userId required for cron' }, { status: 400 })
      }
    } else {
      const session = await getServerSessionFromRequest(request)
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    const pattern = await generateUnseenWinsPatternForUser(userId)
    return NextResponse.json({ pattern })
  } catch (error) {
    console.error('[Pattern Generate] Error:', error)
    return NextResponse.json({ error: 'Failed to generate pattern' }, { status: 500 })
  }
}
