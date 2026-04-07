import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { addWatermark } from '@/lib/watermark'
import { supabase } from '@/lib/supabase'
import { generateEmergencyInsight } from '@/lib/personal-coaching'

const toDateStr = (d: Date) => d.toISOString().split('T')[0]

export async function POST(req: NextRequest) {
  try {
    return withRateLimit(req, 'emergency', async () => {
      const { description, severity, userId } = await req.json()

      let actualUserId = userId
      if (!actualUserId) {
        const session = await getServerSessionFromRequest(req)
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        actualUserId = session.user.id
      }

      const db = getServerSupabase()
      const today = toDateStr(new Date())

      const { data: emergency, error: insertError } = await (db.from('emergencies') as any)
        .insert({
          user_id: actualUserId,
          fire_date: today,
          description,
          severity: severity || 'contained',
          resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      let insight = null
      try {
        insight = await generateEmergencyInsight(
          actualUserId,
          description,
          severity || 'contained',
          today,
          undefined,
          emergency?.id ?? null
        )

        if (insight && emergency?.id) {
          const watermarked = addWatermark(insight, actualUserId)
          await (db.from('emergencies') as any).update({ insight: watermarked }).eq('id', emergency.id)
          insight = watermarked
        }
      } catch (insightError) {
        console.error('Failed to generate emergency insight:', insightError)
      }

      return NextResponse.json({
        success: true,
        emergency,
        insight
      })
    })
  } catch (error) {
    console.error('Emergency API error:', error)
    return NextResponse.json(
      { error: 'Failed to create emergency' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('emergencies')
      .select('*, insight')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (id) {
      query = query.eq('id', id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ emergencies: data })

  } catch (error) {
    console.error('Emergency GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergencies' },
      { status: 500 }
    )
  }
}
