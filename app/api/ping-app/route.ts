/**
 * DIAGNOSTIC: Minimal App Router API route.
 * Test: GET /api/ping-app
 * If this 404s in production, App Router API routes are broken on Vercel.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'app-router',
    timestamp: new Date().toISOString(),
  })
}
