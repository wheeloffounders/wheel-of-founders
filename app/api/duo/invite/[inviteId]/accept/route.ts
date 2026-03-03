import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to accept' }, { status: 401 })
    }

    const { inviteId } = await params
    if (!inviteId) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
    }

    const db = getServerSupabase()

    const { data: inviteRaw, error: fetchError } = await db
      .from('duo_relationships')
      .select('id, primary_user_id, secondary_user_id, invited_email, status, expires_at')
      .eq('id', inviteId)
      .single()

    if (fetchError || !inviteRaw) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    type InviteRow = { id: string; primary_user_id: string; secondary_user_id: string | null; invited_email: string; status: string; expires_at: string | null }
    const invite = inviteRaw as InviteRow

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: invite.status === 'expired' ? 'Invitation has expired' : 'Invitation is no longer valid' },
        { status: 400 }
      )
    }

    const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null
    if (expiresAt && expiresAt < new Date()) {
      await (db.from('duo_relationships') as any).update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', inviteId)
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Verify email matches (case-insensitive)
    const userEmail = session.user.email?.toLowerCase()
    const invitedEmail = (invite.invited_email as string)?.toLowerCase()
    if (!userEmail || userEmail !== invitedEmail) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // Cannot accept your own invite
    if (invite.primary_user_id === session.user.id) {
      return NextResponse.json({ error: 'You cannot accept your own invitation' }, { status: 400 })
    }

    // Update duo relationship
    const { error: updateError } = await (db.from('duo_relationships') as any).update({
      secondary_user_id: session.user.id,
      status: 'active',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', inviteId)

    if (updateError) throw updateError

    // Update secondary user's profile
    await (db.from('user_profiles') as any).upsert(
      {
        id: session.user.id,
        plan_type: 'duo_secondary',
        duo_relationship_id: inviteId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    // Update primary user's profile
    await (db.from('user_profiles') as any).upsert(
      {
        id: invite.primary_user_id,
        plan_type: 'duo_primary',
        duo_relationship_id: inviteId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Duo Accept] Error:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
