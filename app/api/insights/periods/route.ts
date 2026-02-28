import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    console.log('[periods] Session from request:', session ? 'Found' : 'Not found')
    console.log('[periods] Auth header:', req.headers.get('authorization'))
    console.log('[periods] Cookies:', req.cookies.getAll())
    
    if (!session) {
      console.log('[periods] No session, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[periods] User ID:', session.user.id)

    const type = req.nextUrl.searchParams.get('type')
    if (!type || !['weekly', 'monthly', 'quarterly'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    const db = getServerSupabase()
    
    const { data: periods, error } = await db
      .from('personal_prompts')
      .select('prompt_date')
      .eq('user_id', session.user.id)
      .eq('prompt_type', type)
      .order('prompt_date', { ascending: false })

    if (error) throw error

    const periodStrings = (periods as { prompt_date: string }[])?.map(p => 
p.prompt_date) || []
    
    return NextResponse.json({ 
      periods: periodStrings,
      type,
      currentPeriod: periodStrings[0] || null
    })

  } catch (error) {
    console.error('[insights-periods] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch periods' },
      { status: 500 }
    )
  }
}
