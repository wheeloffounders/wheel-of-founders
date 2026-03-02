import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Debug endpoint for environment variable status.
 * GET /api/debug/env - shows which vars are set (not values)
 * Protected: dev only, or requires x-admin-token header matching DEBUG_ADMIN_TOKEN
 */
export async function GET() {
  const headersList = await headers()
  const isDev = process.env.NODE_ENV === 'development'
  const adminToken = headersList.get('x-admin-token')
  const validToken = process.env.DEBUG_ADMIN_TOKEN

  if (!isDev && adminToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const envStatus: Record<string, unknown> = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    supabase: {
      url: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '[hidden]' : null,
      },
      anonKey: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[hidden]' : null,
      },
      serviceRole: {
        present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[hidden]' : null,
      },
    },
    recommendations: [] as string[],
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    ;(envStatus.recommendations as string[]).push(
      'Add NEXT_PUBLIC_SUPABASE_URL to environment'
    )
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    ;(envStatus.recommendations as string[]).push(
      'Add SUPABASE_SERVICE_ROLE_KEY to environment (required for server DB access)'
    )
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    ;(envStatus.recommendations as string[]).push(
      'Add NEXT_PUBLIC_SUPABASE_ANON_KEY to environment (required for auth)'
    )
  }

  return NextResponse.json(envStatus)
}
