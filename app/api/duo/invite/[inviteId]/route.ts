import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params
    if (!inviteId) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
    }

    const db = getServerSupabase()

    const { data: inviteRaw, error } = await db
      .from('duo_relationships')
      .select('id, primary_user_id, secondary_user_id, invited_email, status, expires_at')
      .eq('id', inviteId)
      .single()

    if (error || !inviteRaw) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    type InviteRow = { id: string; invited_email: string; status: string; expires_at: string | null }
    const invite = inviteRaw as InviteRow

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: invite.status === 'expired' ? 'Invitation has expired' : 'Invitation is no longer valid' },
        { status: 400 }
      )
    }

    const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        invited_email: invite.invited_email,
        expires_at: invite.expires_at,
      },
    })
  } catch (error) {
    console.error('[Duo Invite GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch invite' }, { status: 500 })
  }
}
