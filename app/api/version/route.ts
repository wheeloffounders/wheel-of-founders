/**
 * Version API - returns current app version for force-update checks.
 * The client compares this with localStorage to detect when a new deployment is live.
 *
 * Cached at the edge (CDN) to reduce serverless invocations. After deploy, version
 * changes within ~1h as revalidation runs; clients still compare locally and refresh.
 */
import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/version'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      timestamp: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60',
      },
    }
  )
}
