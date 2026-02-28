/**
 * Version API - returns current app version for force-update checks.
 * The client compares this with localStorage to detect when a new deployment is live.
 */
import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/version'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      timestamp: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  )
}
