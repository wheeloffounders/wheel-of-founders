import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    const targetDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : format(new Date(), 'yyyy-MM-dd')

    const db = serverSupabase()

    const { data, error } = await (db.from('scheduled_suggestions') as any)
      .select('content, based_on')
      .eq('user_id', userId)
      .eq('suggestion_date', targetDate)
      .eq('suggestion_type', 'decision_suggestion')
      .maybeSingle()

    if (error) {
      console.error('[suggestions/today] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ suggestions: [], basedOn: null })
    }

    let suggestions: string[] = []
    try {
      const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
      suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    } catch {
      suggestions = []
    }

    return NextResponse.json({
      suggestions,
      basedOn: data.based_on ?? 'patterns/profile',
    })
  } catch (err) {
    console.error('[suggestions/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
