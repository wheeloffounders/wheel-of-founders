import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { getServerSessionFromRequest } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { reviewId, targetDate } = await request.json()

    if (!reviewId || !targetDate) {
      return NextResponse.json({ error: 'Missing reviewId or targetDate' }, { status: 400 })
    }

    const db = getServerSupabase() as any

    // Ensure the review belongs to this user
    const { data: review, error: fetchError } = await db
      .from('evening_reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const typedReview = review as { id: string; user_id: string } | null

    if (!typedReview || typedReview.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const { error: updateError } = await db
      .from('evening_reviews')
      .update({ review_date: targetDate })
      .eq('id', reviewId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('fix-date error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

