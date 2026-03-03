/**
 * Returns a signed timestamp for the current user.
 * Client includes X-Timestamp and X-Signature in AI requests when REQUEST_SIGNATURE_SECRET is set.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { generateSignature, isRequestSigningEnabled } from '@/lib/request-signature'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isRequestSigningEnabled()) {
      return NextResponse.json({ timestamp: Date.now(), signature: '' })
    }

    const timestamp = Date.now()
    const signature = generateSignature(session.user.id, timestamp)

    return NextResponse.json({ timestamp, signature })
  } catch (error) {
    console.error('[request-signature] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    )
  }
}
