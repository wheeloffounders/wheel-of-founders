import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFromRequest(_request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getServerSupabase()

    // Verify the emergency belongs to the user
    const { data: emergency, error: fetchError } = await db
      .from('emergencies')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !emergency || (emergency as { user_id?: string }).user_id !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete the emergency
    const { error: deleteError } = await db
      .from('emergencies')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Emergency Delete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete emergency' },
      { status: 500 }
    )
  }
}
